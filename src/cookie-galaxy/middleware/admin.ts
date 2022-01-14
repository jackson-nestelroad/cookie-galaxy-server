import {AuthenticatedRequest} from './authentication';
import {Middleware} from '../../framework/middleware';

import {NextFunction, Response} from 'express';

/**
 * Middleware that restricts access for non-admin users.
 */
export class AdminMiddleware extends Middleware {
  public run(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (req.user.isAdmin) {
      return next();
    } else {
      return res.status(403).send('Access denied');
    }
  }
}
