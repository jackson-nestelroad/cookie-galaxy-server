import {MiddlewareArray} from './middleware';
import {NextFunction} from 'express-serve-static-core';

import {Request, Response} from 'express';

type RequestHandler = (req: Request, res: Response, next: NextFunction) => void;
type AsyncRequestHandler<T> = (req: Request, res: Response, next: NextFunction) => Promise<T>;
type HttpRequestMethod = 'all' | 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';
type HttpRequestMethodMap = {[method in HttpRequestMethod]?: RequestHandler};

/**
 * A dispatcher for handling multiple HTTP methods on a single route.
 */
export class MethodDispatcher {
  constructor(public readonly map: HttpRequestMethodMap) {}
}

type SingleRouteConfig = RequestHandler | MethodDispatcher;

/**
 * The configuration for a single controller.
 *
 * Maps a tree of routes to various methods for handling.
 */
export type ControllerConfig = {readonly [route: string]: SingleRouteConfig | ControllerConfig};

/**
 * A controller for handling HTTP requests on a certain path.
 */
export abstract class SimpleController {
  public abstract readonly config: ControllerConfig;

  public abstract readonly middleware: MiddlewareArray;
}

/**
 * Properly handles an asynchronous route resolution and error catching.
 * @param {AsyncRequestHandler<T>} asyncHandler Asynchronous route handler.
 * @param {any} context `this` argument to run the handler in.
 * @returns Request handler.
 */
export function asyncRoute<T>(asyncHandler: AsyncRequestHandler<T>, context: any): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(asyncHandler.call(context, req, res, next)).catch(next);
  };
}

/**
 * The configuration for a compound controller.
 *
 * Maps a tree of routes to various controllers for handling.
 */
export type CompoundControllerConfig = {
  readonly [route: string]: ControllerType | CompoundControllerConfig
} | (ControllerType | CompoundControllerConfig)[];

/**
 * A controller for delegating handling HTTP requests to nested controllers.
 */
export abstract class CompoundController {
  public abstract readonly config: CompoundControllerConfig;
}

/**
 * A single controller instance.
 */
export type ControllerInstance = SimpleController | CompoundController;

/**
 * A single controller type.
 */
export type ControllerType = new() => ControllerInstance;
