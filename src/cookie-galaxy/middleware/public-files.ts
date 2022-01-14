import path from 'path';
import {staticFiles} from '../../framework/static-files';

import {Middleware, MiddlewareType} from '../../framework/middleware';
import {NextFunction, Request, Response} from 'express';

// We want to ignore some files to avoid exposing them to the user.
// We specifically want to redirect index.html to the main application page, which will allow the
// `AppController` to handle the request, which preloads the application state accordingly.
class IgnoreFiles extends Middleware {
  private readonly redirectPaths = ['/', '/index.html'];

  public run(req: Request, res: Response, next: NextFunction) {
    if (this.redirectPaths.includes(req.url)) {
      res.redirect('/');
    } else {
      next();
    }
  }
}

/**
 * Middleware for statically serving public files.
 */
export const PublicFilesMiddleware: MiddlewareType[] = [
  IgnoreFiles,
  staticFiles(path.resolve(__dirname, '..', '..', '..', 'front-end')),
];
