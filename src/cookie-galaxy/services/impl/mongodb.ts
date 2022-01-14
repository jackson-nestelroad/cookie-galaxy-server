import {Service} from '../../../framework/service';

import {
  Collection,
  Db,
  Document,
  MongoClient,
  ReadConcern,
  ReadPreference,
  WriteConcern,
} from 'mongodb';
import {
  MongoDbServiceInterface,
  TransactionFunction,
} from '../interfaces/mongodb';

export class MongoDbService implements Service, MongoDbServiceInterface {
  id = Symbol('MongoDbService');

  private readonly client: MongoClient;

  private readonly db: Db;

  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI);
  }

  public async asyncInitialize(): Promise<void> {
    await this.client.connect();
    this['db' as any] = this.client.db();
  }

  public getDatabase(): Db {
    return this.db;
  }

  public getCollection(name: string): Collection<Document> {
    return this.db.collection(name);
  }

  public async transaction<T>(func: TransactionFunction<T>): Promise<T> {
    const session = this.client.startSession({
      defaultTransactionOptions: {
        readPreference: new ReadPreference('primary'),
        readConcern: new ReadConcern('majority'),
        writeConcern: new WriteConcern('majority'),
      },
    });

    try {
      // Run the caller's function as a transaction.
      // Errors should propogate up.
      let result: T;
      await session.withTransaction(async () => {
        result = await func(session);
      });
      return result;
    } catch (err) {
      // Throw error up to the caller.
      throw err;
    } finally {
      await session.endSession();
    }
  }
}

export abstract class MongoDbCollectionService<T extends Document> implements Service {
  public abstract id: Symbol;

  private readonly mongoDbService: MongoDbServiceInterface;

  protected readonly collection: Collection<T>;

  constructor(
    private readonly collectionName: string,
  ) {}

  public initialize(): void {
    this['collection' as any] = this.mongoDbService.getCollection(this.collectionName);
  }
}
