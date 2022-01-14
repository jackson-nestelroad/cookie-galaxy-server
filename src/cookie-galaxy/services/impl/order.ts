import {MongoDbCollectionService} from './mongodb';

import {CookieGalaxyCompletedOrder, CookieGalaxyOrderAddress} from 'cookie-galaxy';
import {
  DependencyInjectionKey,
  UsesDependencyInjection,
} from '../../../framework/dependency-injector';
import {FindOptions, InsertOneOptions, ObjectId} from 'mongodb';
import {NewCookieGalaxyOrder, OrderServiceInterface} from '../interfaces/order';

export class OrderService
  extends MongoDbCollectionService<CookieGalaxyCompletedOrder>
  implements OrderServiceInterface, UsesDependencyInjection {
  id = Symbol('OrderService');

  public inject: DependencyInjectionKey[] = ['mongoDbService'];

  public constructor() {
    super('order');
  }

  public async getOrder(
    userId: ObjectId, orderId: ObjectId, options?: FindOptions,
  ): Promise<CookieGalaxyCompletedOrder> {
    return await this.collection.findOne({_id: orderId, userId}, options);
  }

  public async getOrdersForUser(
    id: ObjectId, options?: FindOptions,
  ): Promise<CookieGalaxyCompletedOrder[]> {
    return await this.collection.find({userId: id}, options).toArray();
  }

  public async createOrder(
    order: NewCookieGalaxyOrder, userId: ObjectId, options?: InsertOneOptions,
  ): Promise<ObjectId> {
    if (!order.shippingAddress) {
      throw new Error('Shipping address required');
    }
    return (await this.collection.insertOne({
      ...order as (
        NewCookieGalaxyOrder & { shippingAddress: CookieGalaxyOrderAddress }
      ),
      userId,
      orderedAt: new Date(),
    }, options)).insertedId;
  }
}
