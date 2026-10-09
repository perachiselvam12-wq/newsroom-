import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import type { Meeting, User, DashboardStats } from '../types';

// ==========================================
// USER PROFILE FIRESTORE OPERATIONS
// ==========================================

export async function saveUserProfile(userData: {
  uid: string;
  fullName: string;
  email: string;
  preferredLanguage?: 'en' | 'ta';
  photoURL?: string;
}): Promise<User> {
  const userRef = doc(db, 'users', userData.uid);
  const now = new Date().toISOString();

  const userPayload: User = {
    id: userData.uid,
    uid: userData.uid,
    name: userData.fullName,
    fullName: userData.fullName,
    email: userData.email.toLowerCase().trim(),
    role: 'journalist',
    preferredLanguage: userData.preferredLanguage || 'en',
    photoURL: userData.photoURL || '',
    theme: 'light',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(userRef, userPayload, { merge: true });
    return userPayload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userData.uid}`);
  }
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const userRef = doc(db, 'users', uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data() as User;
    return {
      ...data,
      id: data.uid || uid,
      uid: data.uid || uid,
      name: data.fullName || data.name || '',
      fullName: data.fullName || data.name || '',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
}

export async function updateUserProfile(uid: string, updates: Partial<User>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const cleanUpdates: Record<string, any> = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  if (updates.name && !updates.fullName) {
    cleanUpdates.fullName = updates.name;
  }

  try {
    await updateDoc(userRef, cleanUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

// ==========================================
// MEETINGS FIRESTORE OPERATIONS
// ==========================================

export async function saveMeetingToFirestore(meeting: Meeting): Promise<Meeting> {
  const meetingRef = doc(db, 'meetings', meeting.id);
  const cleanData: Meeting = {
    ...meeting,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(meetingRef, cleanData);
    return cleanData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `meetings/${meeting.id}`);
  }
}

export async function getMeetingFromFirestore(id: string): Promise<Meeting | null> {
  const meetingRef = doc(db, 'meetings', id);
  try {
    const snap = await getDoc(meetingRef);
    if (!snap.exists()) return null;
    return snap.data() as Meeting;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `meetings/${id}`);
  }
}

export async function updateMeetingInFirestore(id: string, updates: Partial<Meeting>): Promise<void> {
  const meetingRef = doc(db, 'meetings', id);
  const cleanUpdates = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  try {
    await updateDoc(meetingRef, cleanUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `meetings/${id}`);
  }
}

export async function deleteMeetingFromFirestore(id: string): Promise<void> {
  const meetingRef = doc(db, 'meetings', id);
  try {
    await deleteDoc(meetingRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `meetings/${id}`);
  }
}

export async function getUserMeetingsFromFirestore(
  userId: string,
  filters?: {
    savedOnly?: boolean;
    search?: string;
    sourceType?: string;
    language?: string;
  }
): Promise<Meeting[]> {
  try {
    const meetingsColl = collection(db, 'meetings');
    const q = query(
      meetingsColl,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    let results: Meeting[] = [];

    snapshot.forEach((d) => {
      results.push(d.data() as Meeting);
    });

    if (filters?.savedOnly) {
      results = results.filter((m) => m.isSaved);
    }
    if (filters?.sourceType && filters.sourceType !== 'all') {
      results = results.filter(
        (m) => (m.mediaType || m.sourceType) === filters.sourceType
      );
    }
    if (filters?.language && filters.language !== 'all') {
      results = results.filter(
        (m) => m.outputLanguage === filters.language || m.sourceLanguage === filters.language
      );
    }
    if (filters?.search && filters.search.trim()) {
      const s = filters.search.toLowerCase().trim();
      results = results.filter(
        (m) =>
          m.title.toLowerCase().includes(s) ||
          m.headline?.toLowerCase().includes(s) ||
          m.shortSummary?.toLowerCase().includes(s) ||
          m.headlines?.primary?.toLowerCase().includes(s)
      );
    }

    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'meetings');
  }
}

export function subscribeUserMeetings(
  userId: string,
  onUpdate: (meetings: Meeting[]) => void
): () => void {
  const meetingsColl = collection(db, 'meetings');
  const q = query(
    meetingsColl,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const meetings: Meeting[] = [];
      snapshot.forEach((d) => {
        meetings.push(d.data() as Meeting);
      });
      onUpdate(meetings);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'meetings');
    }
  );
}

export function subscribeMeeting(
  id: string,
  onUpdate: (meeting: Meeting | null) => void
): () => void {
  const meetingRef = doc(db, 'meetings', id);
  return onSnapshot(
    meetingRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as Meeting);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `meetings/${id}`);
    }
  );
}

export async function getUserMeetingStats(userId: string): Promise<DashboardStats> {
  const meetings = await getUserMeetingsFromFirestore(userId);
  const totalAnalyses = meetings.length;
  const videosAnalyzed = meetings.filter(
    (m) => (m.mediaType || m.sourceType) === 'video'
  ).length;
  const savedReports = meetings.filter((m) => m.isSaved).length;
  const recent = meetings.slice(0, 5);

  return {
    totalAnalyses,
    videosAnalyzed,
    savedReports,
    recent,
  };
}

export async function seedDemoMeetingForUser(userId: string): Promise<Meeting> {
  const demoMeeting: Meeting = {
    id: `mtg_${Date.now()}_demo`,
    userId,
    title: 'Global Autonomous Systems Council & Falcon-X Commercial Rollout',
    mediaType: 'video',
    sourceType: 'video',
    mediaFileName: 'falcon_x_council_briefing.mp4',
    mediaDuration: '45 mins',
    status: 'completed',
    processingStatus: 'completed',
    uploadStatus: 'completed',
    sourceLanguage: 'en',
    outputLanguage: 'en',
    headline: 'Autonomous Robotics Council Ratifies Commercial Falcon-X Deployment for November 15',
    headlines: {
      primary: 'Autonomous Robotics Council Ratifies Commercial Falcon-X Deployment for November 15',
      breaking: 'ALERT: Commercial Falcon-X Drone Rollout Set for November 15 Following FAA BVLOS Clearance',
      newspaper: 'Engineering Leadership Greenlights High-Density Battery Architecture for Next-Gen Fleet',
      formal: 'Executive Council Resolution: Commercial Aviation Rollout Protocol and Safety Verification',
      digital: 'Falcon-X Passes Crucial High-Temperature Stress Tests as Council Confirms 5,000-Unit Run',
      social: 'Falcon-X deployment ratified for Nov 15! 64-minute flight endurance under full sensor payload confirmed.'
    },
    shortSummary: 'The Global Autonomous Systems Council held a decisive briefing to evaluate commercial deployment readiness for the Falcon-X autonomous drone platform. VP of Hardware Marcus Sterling verified that revised lithium-silicon battery cells achieved 420 Wh/kg, delivering 64 minutes of continuous flight duration with thermal operating limits maintained below 52°C. Dr. Evelyn Vance officially ratified the November 15 commercial launch date, directing manufacturing to deliver 5,000 production units by December 1.',
    detailedSummary: `The Council convened with senior leadership from Systems Architecture, Hardware Engineering, and Aviation Regulatory Affairs. 

Technical Benchmarking:
Marcus Sterling detailed extensive multi-day endurance testing conducted at the Nevada testing grounds. Under 45°C ambient desert conditions, thermal envelopes peaked safely at 52°C, well below the mandatory 60°C emergency threshold. Cell energy density reached 420 Wh/kg, expanding operational flight windows to 64 minutes under full sensor and payload suites.

Regulatory Compliance:
Liam Davis confirmed receipt of the FAA Part 107 Beyond Visual Line of Sight (BVLOS) commercial waiver across designated regional corridors in Nevada and Arizona, clearing the final administrative obstacle.

Firmware & Safety Directives:
Lead Architect Priya Sundaram reported low-probability optical edge-case reflections in dense marine fog. Chief Technology Officer Dr. Evelyn Vance directed immediate deployment of firmware revision 4.2 integrating LiDAR sensor fusion, mandating full test suite sign-off by October 30 before flight authorization.`,
    keyPoints: [
      {
        id: 'pt_1',
        category: 'Main Announcements',
        title: 'Official Falcon-X Launch Date Set for November 15',
        explanation: 'Council executive leadership established November 15 as the immutable public unveiling date.',
        importance: 'High',
        speaker: 'Dr. Evelyn Vance',
        timestamp: '06:45',
        excerpt: 'We officially ratify the November 15 launch date for Falcon-X.'
      },
      {
        id: 'pt_2',
        category: 'Important Facts & Figures',
        title: 'Battery Energy Density Achieves 420 Wh/kg',
        explanation: 'Lithium-silicon cell architecture completed testing, securing 64 minutes sustained flight time.',
        importance: 'High',
        speaker: 'Marcus Sterling',
        timestamp: '01:30',
        excerpt: 'It yields 420 Watt-hours per kilogram, which gives the Falcon-X drone a flight duration of 64 minutes.'
      },
      {
        id: 'pt_3',
        category: 'Decisions Made',
        title: 'FAA Part 107 BVLOS Waiver Formally Secured',
        explanation: 'Federal aviation waiver authorizes autonomous operations in Nevada and Arizona commercial corridors.',
        importance: 'High',
        speaker: 'Liam Davis',
        timestamp: '05:15',
        excerpt: 'The Federal Aviation Administration granted our Part 107 BVLOS waiver on Tuesday.'
      },
      {
        id: 'pt_4',
        category: 'Problems Identified',
        title: 'Optical Reflection Edge Cases in Marine Fog',
        explanation: 'Neural network obstacle detection exhibited minor false positives under high-humidity marine conditions.',
        importance: 'Medium',
        speaker: 'Priya Sundaram',
        timestamp: '08:20',
        excerpt: 'We are still seeing edge-case reflections in foggy conditions.'
      },
      {
        id: 'pt_5',
        category: 'Proposed Solutions',
        title: 'Sensor Fusion Firmware 4.2 Integration',
        explanation: 'Engineers directed to couple LiDAR distance mapping with computer vision to filter fog artifacts.',
        importance: 'High',
        speaker: 'Dr. Evelyn Vance',
        timestamp: '09:10',
        excerpt: 'Deploy model version 4.2 with LiDAR sensor fusion to address fog reflections.'
      }
    ],
    keyDecisions: [
      {
        id: 'dec_1',
        decision: 'Falcon-X commercial announcement and press briefing locked for November 15, 2026.',
        context: 'All regulatory and thermal criteria met expectations.',
        isConfirmed: true,
        decidedBy: 'Dr. Evelyn Vance (CTO)',
        timestamp: '06:45'
      },
      {
        id: 'dec_2',
        decision: 'Production ramp of 5,000 units authorized for completion by December 1, 2026.',
        context: 'Supply chain contracts and manufacturing cell capacity verified.',
        isConfirmed: true,
        decidedBy: 'Marcus Sterling (VP Hardware)',
        timestamp: '07:15'
      }
    ],
    actionItems: [
      {
        id: 'act_1',
        task: 'Complete manufacturing and hardware production sign-off for first 500 units',
        assignedTo: 'Marcus Sterling',
        deadline: 'October 25, 2026',
        status: 'Pending',
        timestamp: '07:20'
      },
      {
        id: 'act_2',
        task: 'Deploy and validate sensor fusion firmware 4.2 with LiDAR fog filtering',
        assignedTo: 'Priya Sundaram',
        deadline: 'October 30, 2026',
        status: 'Pending',
        timestamp: '09:20'
      },
      {
        id: 'act_3',
        task: 'Finalize press briefing press kits and technical specification sheets',
        assignedTo: 'Liam Davis',
        deadline: 'November 8, 2026',
        status: 'Pending',
        timestamp: '10:15'
      }
    ],
    keyFacts: [
      {
        id: 'kf_1',
        category: 'Number',
        item: '420 Wh/kg',
        context: 'Battery energy density achieved on lithium-silicon cells.'
      },
      {
        id: 'kf_2',
        category: 'Number',
        item: '64 Minutes',
        context: 'Maximum sustained flight duration under full operational sensor payload.'
      },
      {
        id: 'kf_3',
        category: 'Organization',
        item: 'Federal Aviation Administration (FAA)',
        context: 'Regulatory body granting the Part 107 BVLOS waiver.'
      },
      {
        id: 'kf_4',
        category: 'Date',
        item: 'November 15, 2026',
        context: 'Official launch date ratified by council.'
      }
    ],
    originalTranscript: `[00:00] Dr. Evelyn Vance: Good morning team. Today our sole agenda is finalizing our commercial drone deployment timeline and resolving the battery density bottleneck before our public press conference on November 15.
[01:30] Marcus Sterling: The revised lithium-silicon cell test completed yesterday at our Nevada testing facility. It yields 420 Watt-hours per kilogram, which gives the Falcon-X drone a flight duration of 64 minutes under full sensor payload.
[05:15] Liam Davis: From a regulatory standpoint, the Federal Aviation Administration granted our Part 107 BVLOS waiver on Tuesday for commercial corridors in Nevada and Arizona.
[06:45] Dr. Evelyn Vance: This is decisive. We officially ratify the November 15 launch date for Falcon-X. Let us make sure production reaches 5,000 units by December 1.`,
    sentiment: 'Decisive & Highly Positive',
    importance: 'High',
    isSaved: true,
    analysisResult: {
      primaryHeadline: 'Autonomous Robotics Council Ratifies Commercial Falcon-X Deployment for November 15',
      alternativeHeadlines: {
        breaking: 'ALERT: Commercial Falcon-X Drone Rollout Set for November 15 Following FAA BVLOS Clearance',
        newspaper: 'Engineering Leadership Greenlights High-Density Battery Architecture for Next-Gen Fleet',
        formal: 'Executive Council Resolution: Commercial Aviation Rollout Protocol and Safety Verification',
        digital: 'Falcon-X Passes Crucial High-Temperature Stress Tests as Council Confirms 5,000-Unit Run',
        social: 'Falcon-X deployment ratified for Nov 15! 64-minute flight endurance under full sensor payload confirmed.'
      },
      quickSummary: 'The Global Autonomous Systems Council held a decisive briefing to evaluate commercial deployment readiness for the Falcon-X autonomous drone platform. VP of Hardware Marcus Sterling verified that revised lithium-silicon battery cells achieved 420 Wh/kg, delivering 64 minutes of continuous flight duration with thermal operating limits maintained below 52°C. Dr. Evelyn Vance officially ratified the November 15 commercial launch date, directing manufacturing to deliver 5,000 production units by December 1.',
      detailedSummary: `The Council convened with senior leadership from Systems Architecture, Hardware Engineering, and Aviation Regulatory Affairs. 

Technical Benchmarking:
Marcus Sterling detailed extensive multi-day endurance testing conducted at the Nevada testing grounds. Under 45°C ambient desert conditions, thermal envelopes peaked safely at 52°C, well below the mandatory 60°C emergency threshold. Cell energy density reached 420 Wh/kg, expanding operational flight windows to 64 minutes under full sensor and payload suites.

Regulatory Compliance:
Liam Davis confirmed receipt of the FAA Part 107 Beyond Visual Line of Sight (BVLOS) commercial waiver across designated regional corridors in Nevada and Arizona, clearing the final administrative obstacle.`,
      executiveSummary: 'Executive council ratified the November 15 commercial rollout of the Falcon-X platform. Crucial milestones met: FAA BVLOS waiver secured, thermal operating limits verified under 52°C, and battery endurance expanded to 64 minutes.',
      importantPoints: [
        {
          id: 'pt_1',
          category: 'Main Announcements',
          title: 'Official Falcon-X Launch Date Set for November 15',
          explanation: 'Council executive leadership established November 15 as the immutable public unveiling date.',
          importance: 'High',
          speaker: 'Dr. Evelyn Vance',
          timestamp: '06:45',
          excerpt: 'We officially ratify the November 15 launch date for Falcon-X.'
        },
        {
          id: 'pt_2',
          category: 'Important Facts & Figures',
          title: 'Battery Energy Density Achieves 420 Wh/kg',
          explanation: 'Lithium-silicon cell architecture completed testing, securing 64 minutes sustained flight time.',
          importance: 'High',
          speaker: 'Marcus Sterling',
          timestamp: '01:30',
          excerpt: 'It yields 420 Watt-hours per kilogram, which gives the Falcon-X drone a flight duration of 64 minutes.'
        }
      ],
      decisions: [
        {
          id: 'dec_1',
          decision: 'Falcon-X commercial announcement locked for November 15, 2026.',
          context: 'All regulatory and thermal criteria met.',
          isConfirmed: true,
          decidedBy: 'Dr. Evelyn Vance (CTO)',
          timestamp: '06:45'
        }
      ],
      actionItems: [
        {
          id: 'act_1',
          task: 'Complete manufacturing and hardware production sign-off for first 500 units',
          assignedTo: 'Marcus Sterling',
          deadline: 'October 25, 2026',
          status: 'Pending',
          timestamp: '07:20'
        }
      ],
      keyFacts: [
        {
          id: 'kf_1',
          category: 'Number',
          item: '420 Wh/kg',
          context: 'Battery energy density achieved on lithium-silicon cells.'
        }
      ],
      pendingQuestions: ['Will international aerospace regulatory approvals (EASA) follow the same timeline?'],
      transcriptSegments: [
        {
          id: 'tr_1',
          speaker: 'Dr. Evelyn Vance',
          timestamp: '00:00',
          text: 'Good morning team. Today our sole agenda is finalizing our commercial drone deployment timeline and resolving the battery density bottleneck.'
        }
      ],
      detectedLanguage: 'en'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return await saveMeetingToFirestore(demoMeeting);
}
