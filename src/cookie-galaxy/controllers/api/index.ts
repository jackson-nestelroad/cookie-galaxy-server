import {CartController} from './cart';
import {ImageController} from './image';
import {ItemController} from './item';
import {OrderController} from './order';
import {UserController} from './user';

import {CompoundController, CompoundControllerConfig} from '../../../framework/controller';

/**
 * Controller for API operations that interact with application data in some way.
 */
export class ApiController extends CompoundController {
  public config: CompoundControllerConfig = {
    cart: CartController,
    image: ImageController,
    item: ItemController,
    orders: OrderController,
    user: UserController,
  };
}
