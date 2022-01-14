import {CookieGalaxyUser} from 'cookie-galaxy';
import {MongoDbCollectionService} from './mongodb';

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
import {NewCookieGalaxyUser, UserServiceInterface} from '../interfaces/user';

export class UserService
  extends MongoDbCollectionService<CookieGalaxyUser>
  implements UserServiceInterface, UsesDependencyInjection {
  id = Symbol('UserService');

  public inject: DependencyInjectionKey[] = ['mongoDbService'];

  public constructor() {
    super('user');
  }

  public async getUserById(id: ObjectId, options?: FindOptions): Promise<CookieGalaxyUser> {
    return await this.collection.findOne({_id: id}, options);
  }

  public async getUserByEmail(email: string, options?: FindOptions): Promise<CookieGalaxyUser> {
    return await this.collection.findOne({email}, options);
  }

  public async createUser(
    user: NewCookieGalaxyUser, options?: InsertOneOptions,
  ): Promise<ObjectId> {
    return (await this.collection.insertOne(user, options)).insertedId;
  }

  public async modifyUser(
    id: ObjectId, update: Partial<CookieGalaxyUser>, options?: UpdateOptions,
  ): Promise<ObjectId> {
    await this.collection.updateOne({_id: id}, {$set: update}, options);
    return id;
  }
}
