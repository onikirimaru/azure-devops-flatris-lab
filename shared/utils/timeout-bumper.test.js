// @flow

import { createTimeoutBumper } from './timeout-bumper';

jest.useFakeTimers();

const TIMEOUT1 = 1000;
const TIMEOUT2 = 2000;
const TIMEOUT3 = 3000;

const handler1 = jest.fn();
const handler2 = jest.fn();
const handler3 = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

test('handlers are called sequentially', () => {
  const { bumpTimeout } = createTimeoutBumper(
    {
      handler: handler1,
      timeout: TIMEOUT1
    },
    {
      handler: handler2,
      timeout: TIMEOUT2
    },
    {
      handler: handler3,
      timeout: TIMEOUT3
    }
  );

  bumpTimeout('1337');

  expect(handler1).not.toHaveBeenCalled();
  expect(handler2).not.toHaveBeenCalled();
  expect(handler3).not.toHaveBeenCalled();

  jest.runTimersToTime(TIMEOUT1);

  expect(handler1).toHaveBeenCalledWith('1337');
  expect(handler1).toHaveBeenCalledTimes(1);
  expect(handler2).not.toHaveBeenCalled();
  expect(handler3).not.toHaveBeenCalled();

  jest.runTimersToTime(TIMEOUT2);

  expect(handler1).toHaveBeenCalledTimes(1);
  expect(handler2).toHaveBeenCalledWith('1337');
  expect(handler2).toHaveBeenCalledTimes(1);
  expect(handler3).not.toHaveBeenCalled();

  jest.runTimersToTime(TIMEOUT3);

  expect(handler1).toHaveBeenCalledTimes(1);
  expect(handler2).toHaveBeenCalledTimes(1);
  expect(handler3).toHaveBeenCalledWith('1337');
  expect(handler3).toHaveBeenCalledTimes(1);

  // From this point we want to make sure the handlers aren't called again
  jest.runTimersToTime(100000);

  expect(handler1).toHaveBeenCalledTimes(1);
  expect(handler2).toHaveBeenCalledTimes(1);
  expect(handler3).toHaveBeenCalledTimes(1);
});

test('handlers are not called while bumping', () => {
  const { bumpTimeout } = createTimeoutBumper(
    {
      handler: handler1,
      timeout: TIMEOUT1
    },
    {
      handler: handler2,
      timeout: TIMEOUT2
    },
    {
      handler: handler3,
      timeout: TIMEOUT3
    }
  );

  bumpTimeout('1337');

  expect(handler1).not.toHaveBeenCalled();
  expect(handler2).not.toHaveBeenCalled();
  expect(handler3).not.toHaveBeenCalled();

  jest.runTimersToTime(TIMEOUT1 - 1);
  bumpTimeout('1337');
  jest.runTimersToTime(TIMEOUT1 - 1);

  expect(handler1).not.toHaveBeenCalled();
  expect(handler2).not.toHaveBeenCalled();
  expect(handler3).not.toHaveBeenCalled();

  jest.runTimersToTime(1);

  expect(handler1).toHaveBeenCalledWith('1337');
  expect(handler1).toHaveBeenCalledTimes(1);
  expect(handler2).not.toHaveBeenCalled();
  expect(handler3).not.toHaveBeenCalled();

  bumpTimeout('1337');
  jest.runTimersToTime(TIMEOUT1 - 1);

  expect(handler1).toHaveBeenCalledWith('1337');
  expect(handler1).toHaveBeenCalledTimes(1);
  expect(handler2).not.toHaveBeenCalled();
  expect(handler3).not.toHaveBeenCalled();

  jest.runTimersToTime(1);

  expect(handler1).toHaveBeenCalledWith('1337');
  expect(handler1).toHaveBeenCalledTimes(2);
  expect(handler2).not.toHaveBeenCalled();
  expect(handler3).not.toHaveBeenCalled();

  jest.runTimersToTime(TIMEOUT2 + TIMEOUT3);

  expect(handler1).toHaveBeenCalledTimes(2);
  expect(handler2).toHaveBeenCalledTimes(1);
  expect(handler3).toHaveBeenCalledTimes(1);
});

test('handlers are canceled', () => {
  const { bumpTimeout, cancelAllTimeouts } = createTimeoutBumper(
    {
      handler: handler1,
      timeout: TIMEOUT1
    },
    {
      handler: handler2,
      timeout: TIMEOUT2
    },
    {
      handler: handler3,
      timeout: TIMEOUT3
    }
  );

  bumpTimeout('1337');
  bumpTimeout('1338');
  bumpTimeout('1339');
  cancelAllTimeouts();

  jest.runTimersToTime(TIMEOUT1 + TIMEOUT2 + TIMEOUT3);

  expect(handler1).not.toHaveBeenCalled();
  expect(handler2).not.toHaveBeenCalled();
  expect(handler3).not.toHaveBeenCalled();
});

// Security tests for prototype pollution vulnerability
describe('prototype pollution protection', () => {
  test('__proto__ does not cause crash when used as id', () => {
    const { bumpTimeout } = createTimeoutBumper(
      {
        handler: handler1,
        timeout: TIMEOUT1
      },
      {
        handler: handler2,
        timeout: TIMEOUT2
      }
    );

    // This should not crash due to prototype pollution
    expect(() => {
      bumpTimeout('__proto__');
    }).not.toThrow();

    // Run timers and verify handlers are called correctly
    jest.runTimersToTime(TIMEOUT1);
    expect(handler1).toHaveBeenCalledWith('__proto__');
    expect(handler1).toHaveBeenCalledTimes(1);

    jest.runTimersToTime(TIMEOUT2);
    expect(handler2).toHaveBeenCalledWith('__proto__');
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  test('constructor does not cause crash when used as id', () => {
    const { bumpTimeout } = createTimeoutBumper(
      {
        handler: handler1,
        timeout: TIMEOUT1
      }
    );

    // This should not crash due to prototype pollution
    expect(() => {
      bumpTimeout('constructor');
    }).not.toThrow();

    jest.runTimersToTime(TIMEOUT1);
    expect(handler1).toHaveBeenCalledWith('constructor');
    expect(handler1).toHaveBeenCalledTimes(1);
  });

  test('prototype does not cause crash when used as id', () => {
    const { bumpTimeout } = createTimeoutBumper(
      {
        handler: handler1,
        timeout: TIMEOUT1
      }
    );

    // This should not crash due to prototype pollution
    expect(() => {
      bumpTimeout('prototype');
    }).not.toThrow();

    jest.runTimersToTime(TIMEOUT1);
    expect(handler1).toHaveBeenCalledWith('prototype');
    expect(handler1).toHaveBeenCalledTimes(1);
  });

  test('multiple prototype-polluting ids can coexist', () => {
    const { bumpTimeout } = createTimeoutBumper(
      {
        handler: handler1,
        timeout: TIMEOUT1
      }
    );

    // Bump multiple potentially dangerous ids
    expect(() => {
      bumpTimeout('__proto__');
      bumpTimeout('constructor');
      bumpTimeout('prototype');
      bumpTimeout('validId123');
    }).not.toThrow();

    jest.runTimersToTime(TIMEOUT1);
    
    // All handlers should be called exactly once for each id
    expect(handler1).toHaveBeenCalledTimes(4);
    expect(handler1).toHaveBeenCalledWith('__proto__');
    expect(handler1).toHaveBeenCalledWith('constructor');
    expect(handler1).toHaveBeenCalledWith('prototype');
    expect(handler1).toHaveBeenCalledWith('validId123');
  });

  test('bumping __proto__ does not affect other timeouts', () => {
    const { bumpTimeout } = createTimeoutBumper(
      {
        handler: handler1,
        timeout: TIMEOUT1
      },
      {
        handler: handler2,
        timeout: TIMEOUT2
      }
    );

    // Bump a normal id and __proto__
    bumpTimeout('normalId');
    bumpTimeout('__proto__');

    jest.runTimersToTime(TIMEOUT1);
    
    // Both should trigger handler1
    expect(handler1).toHaveBeenCalledTimes(2);
    expect(handler1).toHaveBeenCalledWith('normalId');
    expect(handler1).toHaveBeenCalledWith('__proto__');

    jest.runTimersToTime(TIMEOUT2);
    
    // Both should trigger handler2
    expect(handler2).toHaveBeenCalledTimes(2);
    expect(handler2).toHaveBeenCalledWith('normalId');
    expect(handler2).toHaveBeenCalledWith('__proto__');
  });
});
