import pino from "pino";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const isDevelopment = process.env.NODE_ENV !== "production";
const logsDir = join(process.cwd(), "logs");

async function ensureLogsDir() {
  try {
    await mkdir(logsDir, { recursive: true });
  } catch {
    // Directory may already exist
  }
}

function createLogger() {
  ensureLogsDir();

  const transports = pino.transport({
    targets: [
      // File transport - always enabled
      {
        target: "pino/file",
        options: {
          destination: join(logsDir, "app.log"),
        },
      },
      // Pretty console output in development
      ...(isDevelopment
        ? [
            {
              target: "pino-pretty",
              options: {
                colorize: true,
                singleLine: false,
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
              },
            },
          ]
        : []),
    ],
  });

  return pino(
    {
      level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
    },
    transports
  );
}

export let logger = createLogger();

export function setLogger(newLogger: typeof logger) {
  logger = newLogger;
}

export function resetLogger() {
  logger = createLogger();
}

export default logger;
