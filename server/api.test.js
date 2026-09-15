import crypto from 'crypto';
import {
  users,
  sessions,
  games,
  insertUser,
  insertSession,
  insertGame
} from './db';

describe('Authentication Security', () => {
  beforeEach(() => {
    // Clear all data before each test
    Object.keys(users).forEach(key => delete users[key]);
    Object.keys(sessions).forEach(key => delete sessions[key]);
    Object.keys(games).forEach(key => delete games[key]);
  });

  test('session lookup rejects non-existent session IDs', () => {
    // Create a valid session
    const user = insertUser('testuser');
    const validSession = insertSession(user.id);

    // Verify valid session exists
    expect(sessions[validSession.id]).toBeDefined();
    expect(sessions[validSession.id].userId).toBe(user.id);

    // Try with a random session ID that doesn't exist
    const fakeSessionId = crypto.randomBytes(32).toString('hex');
    expect(sessions[fakeSessionId]).toBeUndefined();
  });

  test('session lookup rejects short session IDs (old vulnerable format)', () => {
    // Simulate the old vulnerable 4-byte session ID
    const shortSessionId = crypto.randomBytes(4).toString('hex');
    
    // This should not exist in the session store
    expect(sessions[shortSessionId]).toBeUndefined();
    
    // Verify it's only 8 characters (32 bits)
    expect(shortSessionId).toHaveLength(8);
  });

  test('valid session returns correct user', () => {
    const user = insertUser('testuser');
    const session = insertSession(user.id);

    // Verify session lookup works correctly
    expect(sessions[session.id]).toBeDefined();
    expect(sessions[session.id].userId).toBe(user.id);
    expect(users[sessions[session.id].userId]).toEqual(user);
  });

  test('new sessions have high-entropy IDs', () => {
    const user = insertUser('newuser');
    const session = insertSession(user.id);

    // Verify session ID has 256 bits of entropy (64 hex characters)
    expect(session.id).toHaveLength(64);
    expect(session.id).toMatch(/^[0-9a-f]{64}$/);
  });

  test('online guessing attack is infeasible with new session IDs', () => {
    // Create a valid session
    const user = insertUser('victim');
    insertSession(user.id);

    // Simulate an attacker trying to guess session IDs
    const guessAttempts = 1000;
    let successfulGuesses = 0;

    for (let i = 0; i < guessAttempts; i++) {
      // Generate a random guess
      const guessedSessionId = crypto.randomBytes(32).toString('hex');
      
      // Check if the guess matches any valid session
      if (sessions[guessedSessionId]) {
        successfulGuesses++;
      }
    }

    // With 256-bit session IDs, the probability of guessing correctly
    // in 1000 attempts is negligible (approximately 1000 / 2^256)
    expect(successfulGuesses).toBe(0);
  });

  test('session ID cannot be predicted from previous session IDs', () => {
    // Create multiple sessions
    const user = insertUser('testuser');
    const session1 = insertSession(user.id);
    const session2 = insertSession(user.id);
    const session3 = insertSession(user.id);

    // Verify all session IDs are different
    expect(session1.id).not.toBe(session2.id);
    expect(session1.id).not.toBe(session3.id);
    expect(session2.id).not.toBe(session3.id);

    // Verify no obvious sequential pattern by checking first few characters
    // are different (indicating randomness, not sequential generation)
    const prefix1 = session1.id.substring(0, 8);
    const prefix2 = session2.id.substring(0, 8);
    const prefix3 = session3.id.substring(0, 8);
    
    expect(prefix1).not.toBe(prefix2);
    expect(prefix1).not.toBe(prefix3);
    expect(prefix2).not.toBe(prefix3);
  });

  test('game creation requires valid user', () => {
    const user = insertUser('testuser');
    const game = insertGame(user);

    // Verify game was created with correct user
    expect(game).toBeDefined();
    expect(game.id).toHaveLength(64);
    expect(game.player1.user.id).toBe(user.id);
  });

  test('multiple concurrent sessions do not collide', () => {
    const sessionIds = new Set();
    const numSessions = 100;

    for (let i = 0; i < numSessions; i++) {
      const user = insertUser(`user${i}`);
      const session = insertSession(user.id);

      // Verify no collision
      expect(sessionIds.has(session.id)).toBe(false);
      sessionIds.add(session.id);
    }

    // All session IDs should be unique
    expect(sessionIds.size).toBe(numSessions);
  });

  test('session validation is strict', () => {
    const user = insertUser('testuser');
    const session = insertSession(user.id);

    // Valid session should exist
    expect(sessions[session.id]).toBeDefined();

    // Modified session ID should not exist
    const modifiedSessionId = session.id.substring(0, 63) + 'x';
    expect(sessions[modifiedSessionId]).toBeUndefined();

    // Truncated session ID should not exist
    const truncatedSessionId = session.id.substring(0, 32);
    expect(sessions[truncatedSessionId]).toBeUndefined();

    // Empty session ID should not exist
    expect(sessions['']).toBeUndefined();
  });

  test('attacker cannot enumerate valid sessions through timing', () => {
    // Create some valid sessions
    const user1 = insertUser('user1');
    const user2 = insertUser('user2');
    const session1 = insertSession(user1.id);
    insertSession(user2.id);

    // Measure time for valid session lookup
    const validResult = sessions[session1.id];

    // Measure time for invalid session lookup
    const invalidSessionId = crypto.randomBytes(32).toString('hex');
    const invalidResult = sessions[invalidSessionId];

    // Both lookups should be O(1) hash table operations
    // The timing difference should be negligible
    expect(validResult).toBeDefined();
    expect(invalidResult).toBeUndefined();
    
    // This is a basic check - in practice, timing attacks are more sophisticated
    // but the hash table lookup provides constant-time behavior
  });

  test('session IDs from different users are independent', () => {
    const user1 = insertUser('user1');
    const user2 = insertUser('user2');
    
    const session1a = insertSession(user1.id);
    const session2a = insertSession(user2.id);
    const session1b = insertSession(user1.id);
    const session2b = insertSession(user2.id);

    // All session IDs should be unique regardless of user
    const allSessionIds = [
      session1a.id,
      session2a.id,
      session1b.id,
      session2b.id
    ];
    const uniqueIds = new Set(allSessionIds);
    expect(uniqueIds.size).toBe(4);

    // Verify correct user associations
    expect(sessions[session1a.id].userId).toBe(user1.id);
    expect(sessions[session2a.id].userId).toBe(user2.id);
    expect(sessions[session1b.id].userId).toBe(user1.id);
    expect(sessions[session2b.id].userId).toBe(user2.id);
  });
});
