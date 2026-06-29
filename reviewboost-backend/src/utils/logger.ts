import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, requestId }) => {
    const rid = requestId ? ` [${requestId}]` : '';
    return stack
      ? `${ts}${rid} ${level}: ${message}\n${stack}`
      : `${ts}${rid} ${level}: ${message}`;
  }),
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  winston.format.json(),
);

const level = process.env.LOG_LEVEL ?? 'info';

export const logger = winston.createLogger({
  level,
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
  silent: process.env.NODE_ENV === 'test',
});

/** Morgan write stream — routes HTTP access logs through Winston. */
export const httpLogStream = {
  write: (message: string): void => {
    logger.http(message.trimEnd());
  },
};
