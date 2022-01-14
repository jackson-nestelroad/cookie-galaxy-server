import {CookieGalaxyUser} from 'cookie-galaxy';

import {
  FindOptions,
  InsertOneOptions,
  ObjectId,
  UpdateOptions,
} from 'mongodb';

export type NewCookieGalaxyUser = Omit<CookieGalaxyUser, '_id'>;

/**
 * Service for interacting with user data.
 */
export interface UserServiceInterface  {
  /**
   * Gets a user by ID, which is typically used for token authentication.
   * @param {ObjectId} id User ID.
   * @param {FindOptions} options Optional options.
   * @returns {Promise<CookieGalaxyUser>} User object.
   */
  getUserById(id: ObjectId, options?: FindOptions): Promise<CookieGalaxyUser>;

  /**
   * Gets a user by email, which is typically used for registering and logging in.
   *
   * This object should not be returned to the user if authentication has not been completed.
   * @param {string} email Email address.
   * @param {FindOptions} options Optional options.
   * @returns {Promise<CookieGalaxyUser>} User object.
   */
  getUserByEmail(email: string, options?: FindOptions): Promise<CookieGalaxyUser>;

  /**
   * Creates new user.
   *
   * Be sure the password is hashed!
   * @param {NewCookieGalaxyUser} user New user object.
   * @param {InsertOneOptions} options Optional options.
   * @returns {Promise<ObjectId>} New user ID.
   */
  createUser(user: NewCookieGalaxyUser, options?: InsertOneOptions): Promise<ObjectId>;

  /**
   * Modifies an existing user.
   * @param {ObjectId} id User ID.
   * @param {Partial<CookieGalaxyUser>} update Updated data.
   * @param {UpdateOptions} options Optional options.
   * @returns {Promise<ObjectId>} User ID.
   */
  modifyUser(
    id: ObjectId, update: Partial<CookieGalaxyUser>, options?: UpdateOptions,
  ): Promise<ObjectId>;
}
