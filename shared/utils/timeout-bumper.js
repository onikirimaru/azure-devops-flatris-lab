// @flow

type TimeoutConfig = {
  handler: (id: string) => mixed,
  timeout: number
};

export function createTimeoutBumper(...configs: Array<TimeoutConfig>) {
  // Use Object.create(null) to create prototype-less objects that are immune
  // to prototype pollution attacks via __proto__, constructor, etc.
  const timeoutStep: { [string]: number } = Object.create(null);
  const timeouts: { [string]: TimeoutID } = Object.create(null);

  function schedule(id: string) {
    const step = timeoutStep[id];
    const config = configs[step];
    
    // Guard against undefined config to prevent crashes from invalid state
    if (!config) {
      console.error(`Invalid timeout step ${step} for id ${id}`);
      delete timeoutStep[id];
      delete timeouts[id];
      return;
    }
    
    const { handler, timeout } = config;

    timeouts[id] = setTimeout(() => {
      handler(id);

      if (configs.length > step + 1) {
        timeoutStep[id]++;
        schedule(id);
      } else {
        delete timeoutStep[id];
        delete timeouts[id];
      }
    }, timeout);
  }

  function cancelTimeout(id: string) {
    const prevTimeout = timeouts[id];
    if (prevTimeout) {
      clearTimeout(prevTimeout);

      delete timeoutStep[id];
      delete timeouts[id];
    }
  }

  function cancelAllTimeouts() {
    Object.keys(timeouts).forEach(cancelTimeout);
  }

  function bumpTimeout(id: string) {
    cancelTimeout(id);

    timeoutStep[id] = 0;
    schedule(id);
  }

  return {
    bumpTimeout,
    cancelAllTimeouts
  };
}
