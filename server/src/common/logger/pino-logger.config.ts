import { Params } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import pino from 'pino';
import { resolve } from 'path';

/**
 * Pino logger configuration for NestJS
 * - Production: JSON output for log aggregation
 * - Development: Pretty-printed with colors via custom transport
 */
export const pinoLoggerConfig: Params = {
  pinoHttp: {
    // Generate unique request ID for each request
    genReqId: (req, res) => {
      const existingID =
        req.headers['x-request-id'] || req.headers['x-correlation-id'];
      if (existingID) return existingID;
      const id = randomUUID();
      res.setHeader('X-Request-ID', id);
      return id;
    },
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err,
    },
    // Redact sensitive information
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.token',
        '*.accessToken',
        '*.refreshToken',
        '*.secret',
        '*.apiKey',
      ],
      censor: '[REDACTED]',
    },
    // Custom log level based on HTTP status
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 400 && res.statusCode < 500) {
        return 'warn';
      } else if (res.statusCode >= 500 || err) {
        return 'error';
      }
      return 'info';
    },
    // Auto-log HTTP requests
    autoLogging: {
      ignore: (req) => {
        // Ignore health check endpoints
        return req.url === '/health' || req.url === '/';
      },
    },
    // Production vs Development configuration
    ...(process.env.NODE_ENV === 'production'
      ? {
          // Production: JSON output
          level: process.env.LOG_LEVEL || 'info',
        }
      : {
          // Development: Pretty printing via custom transport
          // messageFormat is a function so it must live in a separate file —
          // pino transports run in a worker thread and functions cannot be
          // transferred across the thread boundary via structured clone.
          level: process.env.LOG_LEVEL || 'debug',
          transport: {
            target: resolve(__dirname, './pino-pretty-transport'),
            options: {
              colorize: true,
              singleLine: false,
              translateTime: 'HH:MM:ss.l',
              ignore: 'pid,hostname',
              errorLikeObjectKeys: ['err', 'error'],
            },
          },
        }),
  },
};
