import {ApiController} from './controllers/api';
import {AppController} from './controllers/app';
import {AuthenticationService} from './services/impl/authentication';
import {CartService} from './services/impl/cart';
import {GridFsService} from './services/impl/gridfs';
import {ItemService} from './services/impl/item';
import {MongoDbService} from './services/impl/mongodb';
import {OrderService} from './services/impl/order';
import {PricingService} from './services/impl/pricing';
import {PublicFilesMiddleware} from './middleware/public-files';
import {Server} from '../framework/server';
import {UserService} from './services/impl/user';

/**
 * Server for Cookie Galaxy.
 */
export class CookieGalaxyServer extends Server {
  protected middleware = {
    // Serve front end build files.
    public: PublicFilesMiddleware,
  };

  protected controllers = {
    api: ApiController,
    '*': AppController,
  };

  protected services = {
    authService: AuthenticationService,
    mongoDbService: MongoDbService,
    itemService: ItemService,
    pricingService: PricingService,
    cartService: CartService,
    userService: UserService,
    orderService: OrderService,
    gridFsService: GridFsService,
  };
}
