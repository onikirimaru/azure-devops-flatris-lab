// @flow

import { EventEmitter } from 'events';
import { attachSocket } from './socket';
import { games, insertGame, insertUser } from './db';

// Mock socket.io
jest.mock('socket.io', () => {
  return jest.fn(() => {
    const io = new EventEmitter();
    io.to = jest.fn(() => io);
    return io;
  });
});

// Mock firebase
jest.mock('./firebase', () => ({
  onStatsChange: jest.fn(),
  incrementTurnCount: jest.fn(),
  incrementLineCount: jest.fn(),
  incrementActionLeft: jest.fn(),
  incrementActionRight: jest.fn(),
  incrementActionAcc: jest.fn(),
  incrementActionRotate: jest.fn(),
  incrementGameTime: jest.fn()
}));

// Mock rollbar
jest.mock('./rollbar', () => ({
  rollbar: {
    error: jest.fn()
  }
}));

// Mock console methods to avoid cluttering test output
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  
  // Clear games before each test
  Object.keys(games).forEach(key => delete games[key]);
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  jest.clearAllMocks();
});

describe('socket game-keep-alive security', () => {
  test('rejects __proto__ as gameId', () => {
    const mockServer = {};
    const socketIo = require('socket.io');
    
    attachSocket(mockServer);
    
    const io = socketIo.mock.results[0].value;
    
    // Simulate a socket connection
    const mockSocket = new EventEmitter();
    mockSocket.id = 'test-socket-id';
    mockSocket.rooms = { [mockSocket.id]: true };
    mockSocket.join = jest.fn();
    mockSocket.leave = jest.fn();
    mockSocket.emit = jest.fn();
    mockSocket.to = jest.fn(() => mockSocket);
    mockSocket.broadcast = mockSocket;
    
    io.emit('connect', mockSocket);
    
    // Get the game-keep-alive handler
    const keepAliveHandler = mockSocket.listeners('game-keep-alive')[0];
    
    // Attempt to send keep-alive with __proto__
    keepAliveHandler('__proto__');
    
    // Should emit game-removed, not broadcast keep-alive
    expect(mockSocket.emit).toHaveBeenCalledWith('game-removed', '__proto__');
    expect(mockSocket.to).not.toHaveBeenCalled();
  });

  test('rejects constructor as gameId', () => {
    const mockServer = {};
    const socketIo = require('socket.io');
    
    attachSocket(mockServer);
    
    const io = socketIo.mock.results[0].value;
    
    const mockSocket = new EventEmitter();
    mockSocket.id = 'test-socket-id';
    mockSocket.rooms = { [mockSocket.id]: true };
    mockSocket.join = jest.fn();
    mockSocket.leave = jest.fn();
    mockSocket.emit = jest.fn();
    mockSocket.to = jest.fn(() => mockSocket);
    mockSocket.broadcast = mockSocket;
    
    io.emit('connect', mockSocket);
    
    const keepAliveHandler = mockSocket.listeners('game-keep-alive')[0];
    keepAliveHandler('constructor');
    
    expect(mockSocket.emit).toHaveBeenCalledWith('game-removed', 'constructor');
  });

  test('rejects prototype as gameId', () => {
    const mockServer = {};
    const socketIo = require('socket.io');
    
    attachSocket(mockServer);
    
    const io = socketIo.mock.results[0].value;
    
    const mockSocket = new EventEmitter();
    mockSocket.id = 'test-socket-id';
    mockSocket.rooms = { [mockSocket.id]: true };
    mockSocket.join = jest.fn();
    mockSocket.leave = jest.fn();
    mockSocket.emit = jest.fn();
    mockSocket.to = jest.fn(() => mockSocket);
    mockSocket.broadcast = mockSocket;
    
    io.emit('connect', mockSocket);
    
    const keepAliveHandler = mockSocket.listeners('game-keep-alive')[0];
    keepAliveHandler('prototype');
    
    expect(mockSocket.emit).toHaveBeenCalledWith('game-removed', 'prototype');
  });

  test('rejects gameId with invalid characters', () => {
    const mockServer = {};
    const socketIo = require('socket.io');
    
    attachSocket(mockServer);
    
    const io = socketIo.mock.results[0].value;
    
    const mockSocket = new EventEmitter();
    mockSocket.id = 'test-socket-id';
    mockSocket.rooms = { [mockSocket.id]: true };
    mockSocket.join = jest.fn();
    mockSocket.leave = jest.fn();
    mockSocket.emit = jest.fn();
    mockSocket.to = jest.fn(() => mockSocket);
    mockSocket.broadcast = mockSocket;
    
    io.emit('connect', mockSocket);
    
    const keepAliveHandler = mockSocket.listeners('game-keep-alive')[0];
    keepAliveHandler('invalid-id-123');
    
    expect(mockSocket.emit).toHaveBeenCalledWith('game-removed', 'invalid-id-123');
  });

  test('rejects non-existent gameId even with valid format', () => {
    const mockServer = {};
    const socketIo = require('socket.io');
    
    attachSocket(mockServer);
    
    const io = socketIo.mock.results[0].value;
    
    const mockSocket = new EventEmitter();
    mockSocket.id = 'test-socket-id';
    mockSocket.rooms = { [mockSocket.id]: true };
    mockSocket.join = jest.fn();
    mockSocket.leave = jest.fn();
    mockSocket.emit = jest.fn();
    mockSocket.to = jest.fn(() => mockSocket);
    mockSocket.broadcast = mockSocket;
    
    io.emit('connect', mockSocket);
    
    const keepAliveHandler = mockSocket.listeners('game-keep-alive')[0];
    keepAliveHandler('abcd1234');
    
    expect(mockSocket.emit).toHaveBeenCalledWith('game-removed', 'abcd1234');
  });

  test('accepts valid existing gameId', () => {
    // Create a real game
    const user = insertUser('Test User');
    const game = insertGame(user);
    
    const mockServer = {};
    const socketIo = require('socket.io');
    
    attachSocket(mockServer);
    
    const io = socketIo.mock.results[0].value;
    
    const mockSocket = new EventEmitter();
    mockSocket.id = 'test-socket-id';
    mockSocket.rooms = { [mockSocket.id]: true };
    mockSocket.join = jest.fn();
    mockSocket.leave = jest.fn();
    mockSocket.emit = jest.fn();
    mockSocket.to = jest.fn(() => mockSocket);
    mockSocket.broadcast = mockSocket;
    
    io.emit('connect', mockSocket);
    
    const keepAliveHandler = mockSocket.listeners('game-keep-alive')[0];
    keepAliveHandler(game.id);
    
    // Should NOT emit game-removed
    expect(mockSocket.emit).not.toHaveBeenCalledWith('game-removed', game.id);
    
    // Should broadcast to global
    expect(mockSocket.to).toHaveBeenCalledWith('global');
  });
});

describe('socket game-action security', () => {
  test('rejects __proto__ as gameId in action payload', () => {
    const mockServer = {};
    const socketIo = require('socket.io');
    
    attachSocket(mockServer);
    
    const io = socketIo.mock.results[0].value;
    
    const mockSocket = new EventEmitter();
    mockSocket.id = 'test-socket-id';
    mockSocket.rooms = { [mockSocket.id]: true };
    mockSocket.join = jest.fn();
    mockSocket.leave = jest.fn();
    mockSocket.emit = jest.fn();
    mockSocket.to = jest.fn(() => mockSocket);
    mockSocket.broadcast = mockSocket;
    
    io.emit('connect', mockSocket);
    
    const actionHandler = mockSocket.listeners('game-action')[0];
    
    const maliciousAction = {
      type: 'MOVE_LEFT',
      payload: {
        gameId: '__proto__',
        userId: 'user123',
        actionId: 1,
        prevActionId: 0
      }
    };
    
    actionHandler(maliciousAction);
    
    // Should emit game-removed
    expect(mockSocket.emit).toHaveBeenCalledWith('game-removed', '__proto__');
    
    // Should NOT broadcast the action
    expect(mockSocket.to).not.toHaveBeenCalled();
  });

  test('rejects constructor as gameId in action payload', () => {
    const mockServer = {};
    const socketIo = require('socket.io');
    
    attachSocket(mockServer);
    
    const io = socketIo.mock.results[0].value;
    
    const mockSocket = new EventEmitter();
    mockSocket.id = 'test-socket-id';
    mockSocket.rooms = { [mockSocket.id]: true };
    mockSocket.join = jest.fn();
    mockSocket.leave = jest.fn();
    mockSocket.emit = jest.fn();
    mockSocket.to = jest.fn(() => mockSocket);
    mockSocket.broadcast = mockSocket;
    
    io.emit('connect', mockSocket);
    
    const actionHandler = mockSocket.listeners('game-action')[0];
    
    const maliciousAction = {
      type: 'MOVE_LEFT',
      payload: {
        gameId: 'constructor',
        userId: 'user123',
        actionId: 1,
        prevActionId: 0
      }
    };
    
    actionHandler(maliciousAction);
    
    expect(mockSocket.emit).toHaveBeenCalledWith('game-removed', 'constructor');
  });

  test('rejects invalid format gameId in action payload', () => {
    const mockServer = {};
    const socketIo = require('socket.io');
    
    attachSocket(mockServer);
    
    const io = socketIo.mock.results[0].value;
    
    const mockSocket = new EventEmitter();
    mockSocket.id = 'test-socket-id';
    mockSocket.rooms = { [mockSocket.id]: true };
    mockSocket.join = jest.fn();
    mockSocket.leave = jest.fn();
    mockSocket.emit = jest.fn();
    mockSocket.to = jest.fn(() => mockSocket);
    mockSocket.broadcast = mockSocket;
    
    io.emit('connect', mockSocket);
    
    const actionHandler = mockSocket.listeners('game-action')[0];
    
    const maliciousAction = {
      type: 'MOVE_LEFT',
      payload: {
        gameId: 'INVALID-ID',
        userId: 'user123',
        actionId: 1,
        prevActionId: 0
      }
    };
    
    actionHandler(maliciousAction);
    
    expect(mockSocket.emit).toHaveBeenCalledWith('game-removed', 'INVALID-ID');
  });

  test('validates gameId format with regex pattern', () => {
    const mockServer = {};
    const socketIo = require('socket.io');
    
    attachSocket(mockServer);
    
    const io = socketIo.mock.results[0].value;
    
    const mockSocket = new EventEmitter();
    mockSocket.id = 'test-socket-id';
    mockSocket.rooms = { [mockSocket.id]: true };
    mockSocket.join = jest.fn();
    mockSocket.leave = jest.fn();
    mockSocket.emit = jest.fn();
    mockSocket.to = jest.fn(() => mockSocket);
    mockSocket.broadcast = mockSocket;
    
    io.emit('connect', mockSocket);
    
    const keepAliveHandler = mockSocket.listeners('game-keep-alive')[0];
    
    // Test various invalid formats
    const invalidIds = [
      '../../../etc/passwd',
      'game.id',
      'game id',
      'game\nid',
      'game\0id',
      '../../game',
      'ABCDEF',  // uppercase
      'abcdefg',  // 'g' is not hex
      '123xyz',   // 'xyz' is not hex
    ];
    
    invalidIds.forEach(invalidId => {
      jest.clearAllMocks();
      keepAliveHandler(invalidId);
      expect(mockSocket.emit).toHaveBeenCalledWith('game-removed', invalidId);
    });
  });
});
