import {CookieGalaxyItem} from 'cookie-galaxy';

import {
  DeleteOptions,
  FindOptions,
  InsertOneOptions,
  ObjectId,
  UpdateOptions,
} from 'mongodb';

export type NewCookieGalaxyItem = Omit<CookieGalaxyItem, '_id'>;

/**
 * Service for interacting with item data.
 */
export interface ItemServiceInterface {
  /**
   * Gets an item by its ID.
   * @param {ObjectId} id Item ID.
   * @param {FindOptions} options Optional options.
   * @returns {Promise<CookieGalaxyItem>} Item object.
   */
  getItem(id: ObjectId, options?: FindOptions): Promise<CookieGalaxyItem>;

  /**
   * Gets multiple items by multiple IDs.
   * @param {ObjectId} ids List of IDs to fetch.
   * @param {FindOptions} options Optional options.
   * @returns {Promise<CookieGalaxyItem>} Array of item objects.
   */
  getItems(ids: ObjectId[], options?: FindOptions): Promise<CookieGalaxyItem[]>;

  /**
   * Gets all items in the database.
   * @param {FindOptions} options Optional options.
   * @returns {Promise<CookieGalaxyItem[]>} All items in the database.
   */
  getAllItems(options?: FindOptions): Promise<CookieGalaxyItem[]>;

  /**
   * Searches for items by partial query and keyword match.
   * @param {string} query Partial match for name, using regular expressions.
   * @param {string[]} keywords Array of case-insensitive keywords to filter by.
   * @param {FindOptions} options Optional options.
   * @returns {Promise<CookieGalaxyItem[]>} All items matched.
   */
  searchItems(
    query: string, keywords: string[], options?: FindOptions,
  ): Promise<CookieGalaxyItem[]>;

  /**
   * Creates a new item.
   * @param {NewCookieGalaxyItem} newItem New item data.
   * @param {InsertOneOptions} options Optional options.
   * @returns {Promise<ObjectId>} ID of new item.
   */
  createItem(newItem: NewCookieGalaxyItem, options?: InsertOneOptions): Promise<ObjectId>;

  /**
   * Deletes an item.
   * @param {ObjectId} id ID of item to delete.
   */
  deleteItem(id: ObjectId, options?: DeleteOptions): Promise<void>;

  /**
   * Updates an item.
   * @param {ObjectId} id ID of item to update.
   * @param {Partial<NewCookieGalaxyItem>} update Updated data.
   * @param {UpdateOptions} options Optional options.
   * @returns {Promise<ObjectId>} Item ID.
   */
  updateItem(
    id: ObjectId, update: Partial<NewCookieGalaxyItem>, options?: UpdateOptions,
  ): Promise<ObjectId>;
}
