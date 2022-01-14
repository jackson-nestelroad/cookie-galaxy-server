import {NextFunction, Request, Response} from 'express';

/**
 * Middleware for handling requests on a given path.
 */
export abstract class Middleware {
  public abstract run(request: Request, response: Response, next: NextFunction): void;
}

/**
 * Middleware for handling requests on a given path asynchronously.
 */
export abstract class AsyncMiddleware {
  public abstract run(request: Request, response: Response, next: NextFunction): Promise<void>;
}

/**
 * A single middleware instance.
 */
export type MiddlewareInstance = Middleware | AsyncMiddleware;

/**
 * A single middleware type.
 */
export type MiddlewareType = new() => MiddlewareInstance;

/**
 * An array of middleware types.
 */
export type MiddlewareArray = MiddlewareType[];
