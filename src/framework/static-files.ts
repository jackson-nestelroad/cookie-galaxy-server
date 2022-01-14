import express from 'express';

import {Middleware, MiddlewareType} from './middleware';

/**
 * Creates a static file server for the given location.
 * @param {string} location Location of the directory to serve, relative to the
 * location where the node process was started.
 * @return {MiddlewareType} Static file middleware.
 */
export function staticFiles(location: string): MiddlewareType {
  return class extends Middleware {
    public run = express.static(location);
  };
}
