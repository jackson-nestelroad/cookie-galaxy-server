import {CookieGalaxyOrder} from 'cookie-galaxy';
import {MongoDbCollectionService} from './mongodb';

import {CartServiceInterface, CookieGalaxyOrderUpdate} from '../interfaces/cart';
import {
  DependencyInjectionKey,
  UsesDependencyInjection,
} from '../../../framework/dependency-injector';
import {
  FindOptions,
  InsertOneOptions,
  ObjectId,
  UpdateOptions,
} from 'mongodb';

export class CartService
  extends MongoDbCollectionService<CookieGalaxyOrder>
  implements CartServiceInterface, UsesDependencyInjection {
  id = Symbol('CartService');

  public inject: DependencyInjectionKey[] = ['mongoDbService'];

  private makeNewCart(): CookieGalaxyOrderUpdate {
    return {
      items: [],
      price: {
        currency: 'USD',
        base: 0,
      },
    };
  }

  public constructor() {
    super('cart');
  }

  public async createCart(options?: InsertOneOptions): Promise<ObjectId> {
    return (await this.collection.insertOne(this.makeNewCart(), options)).insertedId;
  }

  public async getCart(
    id: ObjectId, options?: FindOptions,
  ): Promise<CookieGalaxyOrder> {
    return await this.collection.findOne({_id: id}, options);
  }

  public async updateCart(
    id: ObjectId, update: CookieGalaxyOrderUpdate, options?: UpdateOptions,
  ): Promise<ObjectId> {
    await this.collection.updateOne({_id: id}, {$set: update}, options);
    return id;
  }

  public async resetCart(id: ObjectId, options?: UpdateOptions): Promise<ObjectId> {
    await this.collection.updateOne({_id: id}, {
      $set: this.makeNewCart(),
      $unset: {
        shippingAddress: true,
      },
    }, options);
    return id;
  }
}
