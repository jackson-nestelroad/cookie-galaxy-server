import {CookieGalaxyCompletedOrder, CookieGalaxyOrder} from 'cookie-galaxy';
import {FindOptions, InsertOneOptions, ObjectId} from 'mongodb';

export type NewCookieGalaxyOrder = CookieGalaxyOrder & {_id: never};

/**
 * Service for interacting with order data.
 */
export interface OrderServiceInterface {
  /**
   * Gets an existing order by user ID and order ID.
   *
   * Users may only fetch their own orders.
   * @param {ObjectId} userId User ID.
   * @param {ObjectId} orderId Order ID.
   * @param {FindOptions} options Optional options.
   * @returns {Promise<CookieGalaxyCompletedOrder>} Order object.
   */
  getOrder(
    userId: ObjectId, orderId: ObjectId, options?: FindOptions,
  ): Promise<CookieGalaxyCompletedOrder>;

  /**
   * Gets all orders for a given user.
   * @param {ObjectId} id User ID.
   * @param {FindOptions} options Optional options.
   * @returns {Promise<CookieGalaxyCompletedOrder[]>} All orders for the user.
   */
  getOrdersForUser(
    id: ObjectId, options?: FindOptions,
  ): Promise<CookieGalaxyCompletedOrder[]>;

  /**
   * Creates a new order for the given user.
   * @param {CookieGalaxyOrder} order Order data, typically the same object as the user's cart.
   * @param {ObjectId} userId User who is purchasing this order.
   * @param {InsertOneOptions} options Optional options.
   * @returns {Promise<ObjectId>} New order ID.
   */
  createOrder(
    order: NewCookieGalaxyOrder, userId: ObjectId, options?: InsertOneOptions,
  ): Promise<ObjectId>;
}
