import { Request, Response, NextFunction } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface SuccessEnvelope<T> {
  status: 'success';
  data: T;
}

interface PaginatedEnvelope<T> {
  status: 'success';
  data: T[];
  pagination: PaginationMeta;
}

declare global {
  namespace Express {
    interface Response {
      /**
       * Sends `{ status: "success", data }` with the given HTTP status (default 200).
       */
      success<T>(data: T, statusCode?: number): void;

      /**
       * Sends `{ status: "success", data }` with HTTP 201 Created.
       */
      created<T>(data: T): void;

      /**
       * Sends HTTP 204 No Content (empty body).
       */
      noContent(): void;

      /**
       * Sends a paginated list response.
       * Shape: `{ status: "success", data: T[], pagination: PaginationMeta }`.
       */
      paginated<T>(data: T[], meta: PaginationMeta): void;
    }
  }
}

/**
 * Middleware that attaches standardised response helpers to every `res` object.
 * Mount this as the first application-level middleware so all routes inherit it.
 *
 * All success responses share the same envelope shape, making client-side
 * parsing predictable and eliminating boilerplate in every controller.
 */
export function responseHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.success = function <T>(data: T, statusCode = 200): void {
    const body: SuccessEnvelope<T> = { status: 'success', data };
    this.status(statusCode).json(body);
  };

  res.created = function <T>(data: T): void {
    const body: SuccessEnvelope<T> = { status: 'success', data };
    this.status(201).json(body);
  };

  res.noContent = function (): void {
    this.status(204).send();
  };

  res.paginated = function <T>(data: T[], meta: PaginationMeta): void {
    const body: PaginatedEnvelope<T> = { status: 'success', data, pagination: meta };
    this.status(200).json(body);
  };

  next();
}
