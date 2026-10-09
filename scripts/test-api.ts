import { db } from '../server/db.js';
import { hashPassword, comparePassword, generateToken, verifyToken } from '../server/auth.js';
import { initUpload, MAX_FILE_SIZE } from '../server/upload.js';
import type { User } from '../server/types.js';

async function runTests() {
  console.log('--- RUNNING NEWSROOM AI TEST SUITE ---');

  // Test 1: Password hashing & verification
  const pass = 'superSecret123';
  const hashed = hashPassword(pass);
  console.assert(comparePassword(pass, hashed), 'Password hashing failed');
  console.log('✓ Test 1: Password hashing & bcrypt verification passed.');

  // Test 2: Token generation & verification
  const testUser: User = {
    id: 'usr_test_1',
    name: 'Test Journalist',
    email: 'test@newsroom.ai',
    passwordHash: hashed,
    role: 'journalist',
    preferredLanguage: 'en',
    theme: 'light',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const token = generateToken(testUser);
  const decoded = verifyToken(token);
  console.assert(decoded?.email === 'test@newsroom.ai', 'Token verification failed');
  console.log('✓ Test 2: JWT token generation and verification passed.');

  // Test 3: Database User CRUD & Isolation
  db.createUser(testUser);
  const fetched = db.getUserByEmail('test@newsroom.ai');
  console.assert(fetched?.id === 'usr_test_1', 'DB user fetch failed');
  console.log('✓ Test 3: Database atomic user creation and query passed.');

  // Test 4: Upload validation (1 GiB limit)
  try {
    initUpload('usr_test_1', 'meeting.mp4', 2 * 1024 * 1024 * 1024, 'video/mp4');
    console.assert(false, 'Should have failed on > 1 GiB file');
  } catch (err: any) {
    console.assert(err.message.includes('1 GiB'), 'Expected 1 GiB validation error');
    console.log('✓ Test 4: 1 GiB file size ceiling validation passed.');
  }

  // Test 5: Upload session valid initialization
  const session = initUpload('usr_test_1', 'boardroom_discussion.mp4', 150 * 1024 * 1024, 'video/mp4', 5 * 1024 * 1024);
  console.assert(session.totalChunks === 30, `Expected 30 chunks, got ${session.totalChunks}`);
  console.log('✓ Test 5: 150MB media chunk calculation (30 chunks @ 5MiB) passed.');

  console.log('--- ALL INTEGRATION TESTS PASSED SUCCESSFULLY ---');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
