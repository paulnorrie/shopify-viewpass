/**
 * @file Logging Service: import logger and call log.{info, warn, error, fatal}
 * @description Logging level is set at runtime vis process.env.LOG_LEVEL and defaults to info
 */

import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

export const logStorage = new AsyncLocalStorage();


const baseLogger = pino({
  // read from the LOG_LEVEL environment variable, default to 'info'
  level: process.env.LOG_LEVEL || 'info',
  
  // format numeric levels to strings (e.g., 'info' instead of 30)
  formatters: {
    level(label) {
      return { level: label };
    },
  },

   // AWS automatically injects the correct root 'timestamp' property
  timestamp: false,
  
  // remove unnessecary pid and hostname to keep payloads lean and cost-effective
  base: undefined,
});


// Create a proxy logger that automatically injects context if it exists
export const logger = new Proxy(baseLogger, {
  get(target, property) {
    const store = logStorage.getStore();
    // if we have an active asynchronous store (like an active Lambda request),
    // use a child logger bound with that data. Otherwise, use the base logger.
    const activeLogger = store ? target.child(store) : target;
    return activeLogger[property];
  }
});