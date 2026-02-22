import { LOGGING } from "../config/constants";

/**
 * Simple logger with consistent formatting
 */
export const logger = {
  info(message: string): void {
    console.log(`${LOGGING.PREFIX} ${message}`);
  },

  warn(message: string): void {
    console.warn(`${LOGGING.PREFIX} ${message}`);
  },

  error(message: string): void {
    console.error(`${LOGGING.PREFIX} ✗ ${message}`);
  },

  success(message: string): void {
    console.log(`${LOGGING.PREFIX} ✓ ${message}`);
  },
};
