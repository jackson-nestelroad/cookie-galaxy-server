import {
  ClientSession,
  Collection,
  Db,
  Document,
} from 'mongodb';

export type TransactionFunction<T> = (session: ClientSession) => Promise<T>;

/**
 * Service for connecting to a MongoDB database.
 *
 * Should not be used directly. Rather, indivudal collection services should be used.
 */
export interface MongoDbServiceInterface {
  /**
   * Gets the database instance.
   * @returns {Db} Database instance.
   */
  getDatabase(): Db;

  /**
   * Gets the collection in the database.
   * @param {string} name Collection name.
   * @returns {Collection<Document>} MongoDB collection.
   */
  getCollection(name: string): Collection<Document>;

  /**
   * Runs the given function as a database transaction.
   * @param {TransactionFunction} func Transaction.
   * @returns {Promise<T>} Returned result of the transaction function.
   */
  transaction<T>(func: TransactionFunction<T>): Promise<T>;
}
