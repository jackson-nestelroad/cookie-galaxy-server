import {MiddlewareArray} from '../../../framework/middleware';
import {ObjectId} from 'mongodb';
import {OrderServiceInterface} from '../../services/interfaces/order';
import {Response} from 'express';

import {
  AuthenticatedRequest,
  AuthenticationMiddleware,
  RequireAuthenticationMiddleware,
} from '../../middleware/authentication';
import {ControllerConfig, SimpleController, asyncRoute} from '../../../framework/controller';
import {
  DependencyInjectionKey,
  UsesDependencyInjection,
} from '../../../framework/dependency-injector';

/**
 * Controller for operations on previously completed orders.
 */
export class OrderController extends SimpleController implements UsesDependencyInjection {
  public middleware: MiddlewareArray = [
    AuthenticationMiddleware,
    RequireAuthenticationMiddleware,
  ];

  public config: ControllerConfig = {
    '': asyncRoute(this.getOrders, this),
    ':id': asyncRoute(this.getOrder, this),
  };

  private readonly orderService: OrderServiceInterface;

  public inject: DependencyInjectionKey[] = ['orderService'];

  public async getOrder(req: AuthenticatedRequest, res: Response) {
    if (!req.params.id) {
      return res.status(400).send('Order id required');
    }
    let orderId: ObjectId;
    try {
      orderId = new ObjectId(req.params.id);
    } catch (err) {
      return res.status(400).send('Invalid id');
    }

    // User can only get orders associated with their user ID.
    const order = await this.orderService.getOrder(req.user._id, orderId);
    if (!order) {
      return res.status(404).send('Order does not exist');
    }

    return res.json(order);
  }

  public async getOrders(req: AuthenticatedRequest, res: Response) {
    return res.json(await this.orderService.getOrdersForUser(req.user._id));
  }
}
