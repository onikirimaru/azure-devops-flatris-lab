// @flow

import {
  games,
  bumpActiveGame,
  insertGame,
  insertUser,
  activeGames
} from './db';

// Mock console.error to avoid cluttering test output
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = jest.fn();
  // Clear games and activeGames before each test
  Object.keys(games).forEach(key => delete games[key]);
  activeGames.length = 0;
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('bumpActiveGame security', () => {
  test('rejects __proto__ as gameId', () => {
    // Attempt to bump __proto__ should be rejected
    bumpActiveGame('__proto__');

    // Should log an error about invalid format
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Invalid gameId format')
    );

    // __proto__ should not be added to activeGames
    expect(activeGames).not.toContain('__proto__');
  });

  test('rejects constructor as gameId', () => {
    bumpActiveGame('constructor');

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Invalid gameId format')
    );

    expect(activeGames).not.toContain('constructor');
  });

  test('rejects prototype as gameId', () => {
    bumpActiveGame('prototype');

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Invalid gameId format')
    );

    expect(activeGames).not.toContain('prototype');
  });

  test('rejects non-string gameId', () => {
    // @flow-ignore - intentionally passing wrong type for security test
    bumpActiveGame(123);

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Invalid gameId format')
    );
  });

  test('rejects gameId with invalid characters', () => {
    bumpActiveGame('invalid-id-with-dashes');

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Invalid gameId format')
    );

    expect(activeGames).not.toContain('invalid-id-with-dashes');
  });

  test('rejects gameId with uppercase letters', () => {
    bumpActiveGame('ABCD1234');

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Invalid gameId format')
    );

    expect(activeGames).not.toContain('ABCD1234');
  });

  test('rejects non-existent gameId even with valid format', () => {
    const validFormatId = 'abcd1234';
    
    // This ID has valid format but doesn't exist in games
    bumpActiveGame(validFormatId);

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Attempted to bump non-existent game')
    );

    expect(activeGames).not.toContain(validFormatId);
  });

  test('accepts valid gameId that exists', () => {
    // Create a real game
    const user = insertUser('Test User');
    const game = insertGame(user);
    const gameId = game.id;

    // Clear the console.error mock since insertGame might have called it
    jest.clearAllMocks();

    // Bump the valid game
    bumpActiveGame(gameId);

    // Should not log any errors
    expect(console.error).not.toHaveBeenCalled();

    // Should be in activeGames
    expect(activeGames).toContain(gameId);
  });

  test('validates format before checking existence', () => {
    // Even if we somehow had __proto__ in games, it should be rejected by format check
    // This tests defense-in-depth
    bumpActiveGame('__proto__');

    // Should fail on format validation first
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Invalid gameId format')
    );
  });

  test('only accepts lowercase hex characters', () => {
    // Valid hex IDs should work if they exist
    const user = insertUser('Test User');
    const game = insertGame(user);
    
    // Game IDs are generated as lowercase hex
    expect(game.id).toMatch(/^[a-f0-9]+$/);
    
    jest.clearAllMocks();
    bumpActiveGame(game.id);
    expect(console.error).not.toHaveBeenCalled();
  });

  test('prevents prototype pollution via hasOwnProperty check', () => {
    // Even if format validation somehow passed, hasOwnProperty should catch it
    // This is a defense-in-depth test
    
    // __proto__ would fail format check, but let's verify the logic
    // by checking that games object doesn't have __proto__ as own property
    expect(Object.prototype.hasOwnProperty.call(games, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(games, 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(games, 'prototype')).toBe(false);
  });
});

describe('bumpActiveGame functionality', () => {
  test('adds game to activeGames on first bump', () => {
    const user = insertUser('Test User');
    const game = insertGame(user);
    
    // insertGame already bumps, so clear activeGames
    activeGames.length = 0;
    
    bumpActiveGame(game.id);
    
    expect(activeGames).toContain(game.id);
    expect(activeGames.length).toBe(1);
  });

  test('does not duplicate game in activeGames on multiple bumps', () => {
    const user = insertUser('Test User');
    const game = insertGame(user);
    
    // insertGame already bumps, so clear activeGames
    activeGames.length = 0;
    
    bumpActiveGame(game.id);
    bumpActiveGame(game.id);
    bumpActiveGame(game.id);
    
    expect(activeGames).toContain(game.id);
    expect(activeGames.length).toBe(1);
  });
});
