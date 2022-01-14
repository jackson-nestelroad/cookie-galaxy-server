import {AuthenticationServiceInterface} from '../services/interfaces/authentication';
import {CookieGalaxyUser} from 'cookie-galaxy';
import {UserServiceInterface} from '../services/interfaces/user';

import {AsyncMiddleware, Middleware} from '../../framework/middleware';
import {DependencyInjectionKey, UsesDependencyInjection} from '../../framework/dependency-injector';
import {NextFunction, Request, Response} from 'express';

/**
 * A potentially authenticated HTTP request, which may contain a valid user object.
 */
export type PotentiallyAuthenticatedRequest = Request & {user?: CookieGalaxyUser};

/**
 * Middleware for potentially authenticating a request.
 *
 * Requests that pass through this middleware become a `PotentiallyAuthenticatedRequest`.
 */
export class AuthenticationMiddleware extends AsyncMiddleware implements UsesDependencyInjection {
  private readonly authService: AuthenticationServiceInterface;

  private readonly userService: UserServiceInterface;

  public inject: DependencyInjectionKey[] = ['authService', 'userService'];

  public async run(req: Request, res: Response, next: NextFunction): Promise<any> {
    const {token} = req.cookies;
    if (!token) {
      return next();
    }

    const id = this.authService.verifyToken(token);
    if (!id) {
      res.clearCookie('token');
    } else {
      (req as PotentiallyAuthenticatedRequest).user = await this.userService.getUserById(id);
    }

    // Request is now a PotentiallyAuthenticatedRequest.
    return next();
  }
}

/**
 * An authenticated HTTP request that surely has a valid user object attached.
 */
export type AuthenticatedRequest = Request & {user: CookieGalaxyUser};

/**
 * Middleware for requiring that a `PotentiallyAuthenticatedRequest` contains a valid user object.
 *
 * Disallows non-authenticated requests to pass through.
 */
export class RequireAuthenticationMiddleware extends Middleware {
  public run(req: PotentiallyAuthenticatedRequest, res: Response, next: NextFunction) {
    const {user} = req;
    if (!user) {
      return res.status(403).send('Authentication required');
    }
    // Request is now an AuthenticatedRequest with a valid user object attached.
    return next();
  }
}
