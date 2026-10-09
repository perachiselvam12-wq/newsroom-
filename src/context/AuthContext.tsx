import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  updateProfile as updateFirebaseProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, firebaseConfig } from '../lib/firebase';
import {
  saveUserProfile,
  getUserProfile,
  updateUserProfile as updateFirestoreUserProfile,
} from '../lib/firestoreService';
import { setToken, removeToken } from '../lib/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, preferredLanguage?: 'en' | 'ta') => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateUserPreferences: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function formatAuthError(error: any): string {
  const code = error?.code || '';
  const message = error?.message || '';

  if (code === 'auth/unauthorized-domain' || message.includes('auth/unauthorized-domain')) {
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
    return `Firebase Error (auth/unauthorized-domain): Domain "${currentHost}" is not authorized for Firebase project "${firebaseConfig.projectId}". Verify that "${currentHost}" is in Firebase Console → Authentication → Settings → Authorized domains for "${firebaseConfig.projectId}", and that authDomain is set to "${firebaseConfig.authDomain}".`;
  }

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact support.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completion.';
    case 'auth/too-many-requests':
      return 'Access temporarily blocked due to many failed attempts. Try again later.';
    case 'auth/configuration-not-found':
      return `Firebase Authentication is not configured for project "${firebaseConfig.projectId}". Please enable Authentication in the Firebase Console.`;
    case 'auth/operation-not-allowed':
      return `This sign-in provider is disabled in Firebase Console. Please enable Email/Password or Google provider under Authentication → Sign-in method.`;
    case 'auth/network-request-failed':
      return 'Network request failed. Please check your internet connection or Firebase service status.';
    default:
      return error?.message || 'Authentication failed. Please try again.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Listen to Firebase Authentication state
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        try {
          // Sync ID token for backend multipart requests
          const token = await fbUser.getIdToken();
          setToken(token);

          // Retrieve or populate profile from Firestore
          let profile = await getUserProfile(fbUser.uid);
          if (!profile) {
            profile = await saveUserProfile({
              uid: fbUser.uid,
              fullName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Newsroom Journalist',
              email: fbUser.email || '',
              photoURL: fbUser.photoURL || '',
              preferredLanguage: 'en',
            });
          }
          setUser(profile);
        } catch (err) {
          console.error('[Auth] Failed to sync Firestore user profile:', err);
          // Fallback to minimal user object
          setUser({
            id: fbUser.uid,
            uid: fbUser.uid,
            name: fbUser.displayName || 'Newsroom User',
            fullName: fbUser.displayName || 'Newsroom User',
            email: fbUser.email || '',
            role: 'journalist',
            preferredLanguage: 'en',
            theme: 'light',
          });
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
        removeToken();
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const token = await cred.user.getIdToken();
      setToken(token);

      let profile = await getUserProfile(cred.user.uid);
      if (!profile) {
        profile = await saveUserProfile({
          uid: cred.user.uid,
          fullName: cred.user.displayName || email.split('@')[0],
          email: cred.user.email || email,
          preferredLanguage: 'en',
        });
      }
      setUser(profile);
    } catch (err: any) {
      throw new Error(formatAuthError(err));
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    preferredLanguage: 'en' | 'ta' = 'en'
  ) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (cred.user) {
        await updateFirebaseProfile(cred.user, { displayName: name.trim() });
        const token = await cred.user.getIdToken();
        setToken(token);

        const profile = await saveUserProfile({
          uid: cred.user.uid,
          fullName: name.trim(),
          email: email.trim(),
          preferredLanguage,
        });
        setUser(profile);
      }
    } catch (err: any) {
      throw new Error(formatAuthError(err));
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      if (cred.user) {
        const token = await cred.user.getIdToken();
        setToken(token);

        let profile = await getUserProfile(cred.user.uid);
        if (!profile) {
          profile = await saveUserProfile({
            uid: cred.user.uid,
            fullName: cred.user.displayName || cred.user.email?.split('@')[0] || 'Journalist',
            email: cred.user.email || '',
            photoURL: cred.user.photoURL || '',
            preferredLanguage: 'en',
          });
        }
        setUser(profile);
      }
    } catch (err: any) {
      throw new Error(formatAuthError(err));
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      removeToken();
      setUser(null);
      setFirebaseUser(null);
    } catch (err: any) {
      console.error('[Auth] Error signing out:', err);
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      throw new Error(formatAuthError(err));
    }
  };

  const updateUserPreferences = async (data: Partial<User>) => {
    if (!user) return;
    try {
      await updateFirestoreUserProfile(user.uid, data);
      setUser((prev) => (prev ? { ...prev, ...data } : null));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update preferences');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isLoading,
        login,
        register,
        loginWithGoogle,
        logout,
        sendPasswordReset,
        updateUserPreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
