import {CartServiceInterface} from '../../services/interfaces/cart';
import {MiddlewareArray} from '../../../framework/middleware';
import {Response} from 'express';
import cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

import {
  AuthenticationMiddleware,
  PotentiallyAuthenticatedRequest,
} from '../../middleware/authentication';
import {ControllerConfig, SimpleController, asyncRoute} from '../../../framework/controller';
import {
  DependencyInjectionKey,
  UsesDependencyInjection,
} from '../../../framework/dependency-injector';

/**
 * Controller for serving the application to the user.
 */
export class AppController extends SimpleController implements UsesDependencyInjection {
  public middleware: MiddlewareArray = [
    AuthenticationMiddleware,
  ];

  public config: ControllerConfig = {
    '': asyncRoute(this.render, this),
  }

  private readonly cartService: CartServiceInterface;

  public inject: DependencyInjectionKey[] = ['cartService'];

  private getIndexHtml(initialState: object) {
    const indexHtml = fs.readFileSync(
      path.resolve(__dirname, '..', '..', '..', '..', 'front-end', 'index.html'),
    );
    const $ = cheerio.load(indexHtml);
    const root = $('#root');
    // One day could potentially use ReactDOMServer here to render an initial state of the
    // application. However, separating the back-end and front-end makes this much more
    // difficult to do.
    root.after(`
    <script>
      window.__PRELOADED_STATE__ = ${JSON.stringify(initialState).replace(/</g, '\\u003c')}
    </script>
    `);
    return $.html();
  }

  public async render(req: PotentiallyAuthenticatedRequest, res: Response) {
    const cart = req.user ? await this.cartService.getCart(req.user.cartId) : undefined;
    const html = this.getIndexHtml({
      authentication: {
        user: req.user,
      },
      cart: {
        cart,
        itemCache: {},
        itemCacheErrorMessage: '',
      },
    });
    res.send(html);
  }
}
