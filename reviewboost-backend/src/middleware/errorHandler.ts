import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

interface ErrorResponseBody {
  status: 'error' | 'fail';
  message: string;
  requestId?: string;
  errors?: Record<string, string[]>;
  stack?: string;
}

function handleCastError(err: mongoose.Error.CastError): AppError {
  return new AppError(`Invalid value for field '${err.path}': ${String(err.value)}`, 400);
}

function handleValidationError(err: mongoose.Error.ValidationError): AppError {
  const messages = Object.values(err.errors).map((e) => e.message);
  return new AppError(messages.join('. '), 422);
}

function handleDuplicateKeyError(err: Error & { keyValue?: Record<string, unknown> }): AppError {
  const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'field';
  return new AppError(`A record with that ${field} already exists`, 409);
}

function handleJWTError(): AppError {
  return new AppError('Invalid token — please log in again', 401);
}

function handleJWTExpiredError(): AppError {
  return new AppError('Your session has expired — please log in again', 401);
}

/**
 * Global Express error handler.
 * Maps known error types (Mongoose, JWT, Zod, operational AppErrors) to clean
 * JSON responses. Never leaks stack traces in production.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const showDetails = !['production', 'staging'].includes(process.env.NODE_ENV ?? '');
  let error: Error = err;

  // Normalise known error types into AppError
  if (err instanceof mongoose.Error.CastError) {
    error = handleCastError(err);
  } else if (err instanceof mongoose.Error.ValidationError) {
    error = handleValidationError(err);
  } else if ((err as { code?: string | number }).code === 11000 || (err as { code?: string | number }).code === '11000') {
    error = handleDuplicateKeyError(err as Error & { keyValue?: Record<string, unknown> });
  } else if (err instanceof TokenExpiredError) {
    error = handleJWTExpiredError();
  } else if (err instanceof JsonWebTokenError) {
    error = handleJWTError();
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join('.') || 'root';
      errors[path] = [...(errors[path] ?? []), issue.message];
    }
    const body: ErrorResponseBody = {
      status: 'fail',
      message: 'Validation failed',
      errors,
      requestId: req.requestId,
    };
    res.status(400).json(body);
    return;
  }

  // Operational AppErrors
  if (error instanceof AppError) {
    const body: ErrorResponseBody = {
      status: error.statusCode >= 500 ? 'error' : 'fail',
      message: error.message,
      requestId: req.requestId,
    };
    res.status(error.statusCode).json(body);
    return;
  }

  // Unexpected errors — log full details, never expose internals
  logger.error('Unhandled error', { err: error, requestId: req.requestId });

  const body: ErrorResponseBody = {
    status: 'error',
    message: showDetails ? error.message : 'An unexpected error occurred',
    requestId: req.requestId,
    ...(showDetails && { stack: error.stack }),
  };

  res.status(500).json(body);
}
