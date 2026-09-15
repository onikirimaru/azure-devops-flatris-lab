// @flow

import { games, sessions, users, insertGame, insertUser, insertSession } from './db';

// Mock firebase
jest.mock('./firebase', () => ({
  getStats: jest.fn(() => Promise.resolve({ totalGames: 0, totalUsers: 0 })),
  incrementUserCount: jest.fn(),
  incrementGameCount: jest.fn()
}));

// Mock rollbar
jest.mock('./rollbar', () => ({
  rollbar: {
    error: jest.fn()
  }
}));

// Mock console to avoid cluttering test output
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
  
  // Clear all data stores
  Object.keys(games).forEach(key => delete games[key]);
  Object.keys(sessions).forEach(key => delete sessions[key]);
  Object.keys(users).forEach(key => delete users[key]);
});

afterEach(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  jest.clearAllMocks();
});

// Helper function to simulate validation logic from api.js
function isValidGameId(gameId: any): boolean {
  return (
    gameId &&
    typeof gameId === 'string' &&
    /^[a-f0-9]+$/.test(gameId) &&
    Object.prototype.hasOwnProperty.call(games, gameId)
  );
}

function isValidSessionId(sessionId: any): boolean {
  return (
    typeof sessionId === 'string' &&
    /^[a-f0-9]+$/.test(sessionId) &&
    Object.prototype.hasOwnProperty.call(sessions, sessionId)
  );
}

function isValidUserId(userId: any): boolean {
  return (
    typeof userId === 'string' &&
    /^[a-f0-9]+$/.test(userId) &&
    Object.prototype.hasOwnProperty.call(users, userId)
  );
}

describe('gameId validation security', () => {
  test('rejects __proto__ as gameId', () => {
    expect(isValidGameId('__proto__')).toBe(false);
  });

  test('rejects constructor as gameId', () => {
    expect(isValidGameId('constructor')).toBe(false);
  });

  test('rejects prototype as gameId', () => {
    expect(isValidGameId('prototype')).toBe(false);
  });

  test('rejects gameId with invalid characters', () => {
    expect(isValidGameId('invalid-id-123')).toBe(false);
  });

  test('rejects gameId with uppercase letters', () => {
    expect(isValidGameId('ABCD1234')).toBe(false);
  });

  test('rejects non-existent gameId even with valid format', () => {
    expect(isValidGameId('abcd1234')).toBe(false);
  });

  test('accepts valid existing gameId', () => {
    const user = insertUser('Test User');
    const game = insertGame(user);
    
    expect(isValidGameId(game.id)).toBe(true);
  });

  test('validates format before checking existence', () => {
    // Even if __proto__ somehow existed in games, format check should reject it
    expect(isValidGameId('__proto__')).toBe(false);
  });

  test('only accepts lowercase hex characters', () => {
    const invalidFormats = [
      'game123',  // contains 'g'
      '123xyz',   // contains 'xyz'
      'ABCDEF',   // uppercase
      '../../../etc/passwd',
      'game.id',
      'game id',
      'game\nid',
    ];
    
    invalidFormats.forEach(invalidId => {
      expect(isValidGameId(invalidId)).toBe(false);
    });
  });

  test('rejects non-string gameId', () => {
    expect(isValidGameId(123)).toBe(false);
    expect(isValidGameId(null)).toBe(false);
    expect(isValidGameId(undefined)).toBe(false);
    expect(isValidGameId({})).toBe(false);
    expect(isValidGameId([])).toBe(false);
  });
});

describe('sessionId validation security', () => {
  test('rejects __proto__ as sessionId', () => {
    expect(isValidSessionId('__proto__')).toBe(false);
  });

  test('rejects constructor as sessionId', () => {
    expect(isValidSessionId('constructor')).toBe(false);
  });

  test('rejects prototype as sessionId', () => {
    expect(isValidSessionId('prototype')).toBe(false);
  });

  test('rejects invalid format sessionId', () => {
    expect(isValidSessionId('INVALID-SESSION')).toBe(false);
  });

  test('rejects non-existent sessionId', () => {
    expect(isValidSessionId('abcd1234')).toBe(false);
  });

  test('accepts valid existing sessionId', () => {
    const user = insertUser('Test User');
    const session = insertSession(user.id);
    
    expect(isValidSessionId(session.id)).toBe(true);
  });

  test('rejects non-string sessionId', () => {
    expect(isValidSessionId(123)).toBe(false);
    expect(isValidSessionId(null)).toBe(false);
    expect(isValidSessionId(undefined)).toBe(false);
  });
});

describe('userId validation security', () => {
  test('rejects __proto__ as userId', () => {
    expect(isValidUserId('__proto__')).toBe(false);
  });

  test('rejects constructor as userId', () => {
    expect(isValidUserId('constructor')).toBe(false);
  });

  test('rejects prototype as userId', () => {
    expect(isValidUserId('prototype')).toBe(false);
  });

  test('rejects invalid format userId', () => {
    expect(isValidUserId('INVALID-USER')).toBe(false);
  });

  test('rejects non-existent userId', () => {
    expect(isValidUserId('abcd1234')).toBe(false);
  });

  test('accepts valid existing userId', () => {
    const user = insertUser('Test User');
    
    expect(isValidUserId(user.id)).toBe(true);
  });

  test('rejects non-string userId', () => {
    expect(isValidUserId(123)).toBe(false);
    expect(isValidUserId(null)).toBe(false);
    expect(isValidUserId(undefined)).toBe(false);
  });
});

describe('comprehensive prototype pollution prevention', () => {
  test('all prototype-polluting strings are rejected as gameId', () => {
    const prototypePollutionStrings = [
      '__proto__',
      'constructor',
      'prototype',
      '__defineGetter__',
      '__defineSetter__',
      '__lookupGetter__',
      '__lookupSetter__',
    ];
    
    prototypePollutionStrings.forEach(pollutionString => {
      expect(isValidGameId(pollutionString)).toBe(false);
    });
  });

  test('validates with both format check and hasOwnProperty', () => {
    // The validation should use both:
    // 1. Format validation (regex)
    // 2. hasOwnProperty check
    
    // __proto__ fails format check (not matching /^[a-f0-9]+$/)
    expect(isValidGameId('__proto__')).toBe(false);
    
    // Even a valid format that doesn't exist should fail hasOwnProperty check
    expect(isValidGameId('deadbeef')).toBe(false);
  });

  test('hasOwnProperty prevents inherited properties', () => {
    // Verify that inherited properties are not considered valid
    expect(Object.prototype.hasOwnProperty.call(games, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(games, 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(games, 'prototype')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(games, 'toString')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(games, 'valueOf')).toBe(false);
  });

  test('regex pattern only allows lowercase hex', () => {
    const hexRegex = /^[a-f0-9]+$/;
    
    // Valid hex strings
    expect(hexRegex.test('abc123')).toBe(true);
    expect(hexRegex.test('deadbeef')).toBe(true);
    expect(hexRegex.test('0123456789abcdef')).toBe(true);
    
    // Invalid strings
    expect(hexRegex.test('__proto__')).toBe(false);
    expect(hexRegex.test('constructor')).toBe(false);
    expect(hexRegex.test('prototype')).toBe(false);
    expect(hexRegex.test('ABCDEF')).toBe(false);  // uppercase
    expect(hexRegex.test('abc-123')).toBe(false);  // dash
    expect(hexRegex.test('abc.123')).toBe(false);  // dot
    expect(hexRegex.test('abc 123')).toBe(false);  // space
    expect(hexRegex.test('abc\n123')).toBe(false);  // newline
    expect(hexRegex.test('../abc')).toBe(false);  // path traversal
    expect(hexRegex.test('')).toBe(false);  // empty string
  });
});

describe('defense in depth validation', () => {
  test('format validation is first line of defense', () => {
    // Format validation should reject before hasOwnProperty check
    // This is important because it's faster and catches most attacks
    
    const invalidFormats = [
      '__proto__',
      'constructor',
      'prototype',
      '../../../etc/passwd',
      'UPPERCASE',
      'with-dashes',
      'with.dots',
      'with spaces',
    ];
    
    invalidFormats.forEach(invalidFormat => {
      // These should fail the regex test
      expect(/^[a-f0-9]+$/.test(invalidFormat)).toBe(false);
    });
  });

  test('hasOwnProperty is second line of defense', () => {
    // Even if format validation passed, hasOwnProperty should catch
    // non-existent games
    
    const validFormatNonExistent = 'deadbeef';
    
    // Passes format check
    expect(/^[a-f0-9]+$/.test(validFormatNonExistent)).toBe(true);
    
    // But fails hasOwnProperty check
    expect(Object.prototype.hasOwnProperty.call(games, validFormatNonExistent)).toBe(false);
    
    // So overall validation fails
    expect(isValidGameId(validFormatNonExistent)).toBe(false);
  });

  test('type check prevents non-string attacks', () => {
    // Type check should be part of validation
    const nonStrings = [
      123,
      null,
      undefined,
      {},
      [],
      true,
      false,
    ];
    
    nonStrings.forEach(nonString => {
      expect(isValidGameId(nonString)).toBe(false);
    });
  });
});
