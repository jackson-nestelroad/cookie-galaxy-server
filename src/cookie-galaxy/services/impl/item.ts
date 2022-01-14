import {CookieGalaxyItem} from 'cookie-galaxy';
import {MongoDbCollectionService} from './mongodb';

import {
  DeleteOptions,
  Filter,
  FindOptions,
  InsertOneOptions,
  ObjectId,
  UpdateOptions,
} from 'mongodb';
import {
  DependencyInjectionKey,
  UsesDependencyInjection,
} from '../../../framework/dependency-injector';
import {ItemServiceInterface, NewCookieGalaxyItem} from '../interfaces/item';

export class ItemService
  extends MongoDbCollectionService<CookieGalaxyItem>
  implements ItemServiceInterface, UsesDependencyInjection {
  id = Symbol('ItemService');

  public inject: DependencyInjectionKey[] = ['mongoDbService'];

  public constructor() {
    super('item');
  }

  public async getItem(id: ObjectId, options: FindOptions): Promise<CookieGalaxyItem> {
    return await this.collection.findOne({_id: id}, options);
  }

  public async getItems(ids: ObjectId[], options?: FindOptions): Promise<CookieGalaxyItem[]> {
    return await this.collection.find({
      _id: {
        $in: ids,
      },
    }, options).toArray();
  }

  public async getAllItems(options?: FindOptions): Promise<CookieGalaxyItem[]> {
    return await this.collection.find({}, options).toArray();
  }

  public async searchItems(
    query: string, keywords: string[], options?: FindOptions,
  ): Promise<CookieGalaxyItem[]> {
    const filter: Filter<CookieGalaxyItem> = {
      name: {
        $regex: new RegExp(`${query || '.*'}`, 'i'),
      },
    };
    if (keywords.length !== 0) {
      filter.keywords = {
        $all: keywords,
      };
    }
    return await this.collection.find(filter, options).toArray();
  }

  public async createItem(
    newItem: NewCookieGalaxyItem, options?: InsertOneOptions,
  ): Promise<ObjectId> {
    return (await this.collection.insertOne(newItem, options)).insertedId;
  }

  public async deleteItem(id: ObjectId, options?: DeleteOptions): Promise<void> {
    // await this.collection.deleteOne({_id: id}, options);
    await this.collection.updateOne({_id: id}, {$set: {deleted: true}}, options);
  }

  public async updateItem(
    id: ObjectId, update: Partial<NewCookieGalaxyItem>, options?: UpdateOptions,
  ): Promise<ObjectId> {
    await this.collection.updateOne({_id: id}, {$set: update}, options);
    return id;
  }
}
