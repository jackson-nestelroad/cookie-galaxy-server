import {CookieGalaxyOrder} from 'cookie-galaxy';

import {
  FindOptions,
  InsertOneOptions,
  ObjectId,
  UpdateOptions,
} from 'mongodb';

export type CookieGalaxyOrderUpdate = Omit<CookieGalaxyOrder, '_id'>;

/**
 * Service for interacting with cart data.
 */
export interface CartServiceInterface {
  /**
   * Creates a new cart.
   *
   * Should only be used for new user registration, since a user's cart reuses the same object
   * forever. See `resetCart`.
   *
   * @param {InsertOneOptions} options Optional options.
   * @returns {Promise<ObjectId>} New cart ID.
   */
  createCart(options?: InsertOneOptions): Promise<ObjectId>;

  /**
   * Gets a cart by its ID.
   * @param {ObjectId} id Cart ID, which can be retrieved from a user object.
   * @param {FindOptions} options Optional options.
   * @returns {Promise<CookieGalaxyOrder>} The cart object.
   */
  getCart(id: ObjectId, options?: FindOptions): Promise<CookieGalaxyOrder>;

  /**
   * Updates a cart.
   * @param {ObjectId} id Cart ID.
   * @param {CookieGalaxyOrderUpdate} update Updated cart.
   * @param {UpdateOptions} options Optional options.
   * @returns {Promise<ObjectId>} Cart ID.
   */
  updateCart(
    id: ObjectId, update: CookieGalaxyOrderUpdate, options?: UpdateOptions,
  ): Promise<ObjectId>;

  /**
   * Resets a cart to its initial state with no items or price.
   *
   * The previous cart should already be saved as a completed order before this method is called.
   * @param {ObjectId} id Cart ID.
   * @param {UpdateOptions} options Optional options.
   * @returns {Promise<ObjectId>} Cart ID.
   */
  resetCart(id: ObjectId, options?: UpdateOptions): Promise<ObjectId>;
}
