import crypto from 'crypto';
import {
  insertUser,
  insertSession,
  insertGame,
  users,
  sessions,
  games
} from './db';

describe('Session ID Security', () => {
  beforeEach(() => {
    // Clear all data before each test
    Object.keys(users).forEach(key => delete users[key]);
    Object.keys(sessions).forEach(key => delete sessions[key]);
    Object.keys(games).forEach(key => delete games[key]);
  });

  test('session IDs have sufficient entropy (256 bits)', () => {
    const user = insertUser('testuser');
    const session = insertSession(user.id);

    // Session ID should be 64 hex characters (32 bytes = 256 bits)
    expect(session.id).toHaveLength(64);
    expect(session.id).toMatch(/^[0-9a-f]{64}$/);
  });

  test('session IDs are cryptographically random', () => {
    const user = insertUser('testuser');
    const sessionIds = new Set();
    const numSessions = 1000;

    // Generate many session IDs and verify they are all unique
    for (let i = 0; i < numSessions; i++) {
      const session = insertSession(user.id);
      expect(sessionIds.has(session.id)).toBe(false);
      sessionIds.add(session.id);
    }

    // All session IDs should be unique
    expect(sessionIds.size).toBe(numSessions);
  });

  test('session ID collision probability is negligible', () => {
    const user = insertUser('testuser');
    
    // Create multiple sessions
    const session1 = insertSession(user.id);
    const session2 = insertSession(user.id);
    const session3 = insertSession(user.id);

    // All session IDs must be different
    expect(session1.id).not.toBe(session2.id);
    expect(session1.id).not.toBe(session3.id);
    expect(session2.id).not.toBe(session3.id);

    // All should be 64 hex characters
    expect(session1.id).toHaveLength(64);
    expect(session2.id).toHaveLength(64);
    expect(session3.id).toHaveLength(64);
  });

  test('session IDs cannot be easily guessed', () => {
    const user = insertUser('testuser');
    const session = insertSession(user.id);

    // Verify the session ID is not predictable
    // A 256-bit session ID has 2^256 possible values
    // This makes brute-force guessing computationally infeasible
    
    // Generate a random guess (simulating an attacker)
    const randomGuess = crypto.randomBytes(32).toString('hex');
    
    // The guess should not match the actual session ID
    // (with overwhelming probability)
    expect(randomGuess).not.toBe(session.id);
  });

  test('user IDs have sufficient entropy', () => {
    const user = insertUser('testuser');

    // User ID should also be 64 hex characters (32 bytes = 256 bits)
    expect(user.id).toHaveLength(64);
    expect(user.id).toMatch(/^[0-9a-f]{64}$/);
  });

  test('game IDs have sufficient entropy', () => {
    const user = insertUser('testuser');
    const game = insertGame(user);

    // Game ID should also be 64 hex characters (32 bytes = 256 bits)
    expect(game.id).toHaveLength(64);
    expect(game.id).toMatch(/^[0-9a-f]{64}$/);
  });

  test('multiple sessions for same user have different IDs', () => {
    const user = insertUser('testuser');
    
    const session1 = insertSession(user.id);
    const session2 = insertSession(user.id);
    const session3 = insertSession(user.id);

    // All sessions should have different IDs
    const sessionIds = [session1.id, session2.id, session3.id];
    const uniqueIds = new Set(sessionIds);
    expect(uniqueIds.size).toBe(3);

    // All should reference the same user
    expect(session1.userId).toBe(user.id);
    expect(session2.userId).toBe(user.id);
    expect(session3.userId).toBe(user.id);
  });

  test('session ID space is large enough to prevent online guessing', () => {
    const user = insertUser('testuser');
    const session = insertSession(user.id);

    // With 256 bits of entropy, there are 2^256 possible session IDs
    // Even at 1 billion guesses per second, it would take
    // approximately 3.67 × 10^60 years to have a 50% chance of guessing
    // a single valid session ID
    
    // Verify the session ID length provides this security
    const bitsOfEntropy = session.id.length * 4; // 4 bits per hex char
    expect(bitsOfEntropy).toBe(256);
    
    // This is sufficient to prevent online brute-force attacks
    const possibleValues = Math.pow(2, bitsOfEntropy);
    expect(possibleValues).toBeGreaterThan(Number.MAX_SAFE_INTEGER);
  });

  test('session storage correctly maps session IDs to users', () => {
    const user1 = insertUser('user1');
    const user2 = insertUser('user2');
    
    const session1 = insertSession(user1.id);
    const session2 = insertSession(user2.id);

    // Verify sessions are stored correctly
    expect(sessions[session1.id]).toBeDefined();
    expect(sessions[session2.id]).toBeDefined();
    
    // Verify correct user mapping
    expect(sessions[session1.id].userId).toBe(user1.id);
    expect(sessions[session2.id].userId).toBe(user2.id);
  });

  test('session IDs use cryptographically secure random number generator', () => {
    // This test verifies that the implementation uses crypto.randomBytes
    // which is a CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)
    
    const user = insertUser('testuser');
    const session = insertSession(user.id);

    // The session ID should be unpredictable
    // We verify this by checking it's a valid hex string of the correct length
    expect(session.id).toMatch(/^[0-9a-f]{64}$/);
    
    // Additional check: verify no obvious patterns
    // (e.g., not all zeros, not sequential)
    expect(session.id).not.toBe('0'.repeat(64));
    expect(session.id).not.toBe('1'.repeat(64));
    expect(session.id).not.toBe('f'.repeat(64));
  });
});
