import {GridFsServiceInterface} from '../interfaces/gridfs';
import {MongoDbServiceInterface} from '../interfaces/mongodb';
import {Service} from '../../../framework/service';
import stream from 'stream';

import {
  DependencyInjectionKey,
  UsesDependencyInjection,
} from '../../../framework/dependency-injector';
import {GridFSBucket, GridFSFile} from 'mongodb';

export class GridFsService implements GridFsServiceInterface, Service, UsesDependencyInjection {
  id = Symbol('GridFsService');

  private readonly bucket: GridFSBucket;

  private readonly mongoDbService: MongoDbServiceInterface;

  public inject: DependencyInjectionKey[] = ['mongoDbService'];

  public initialize(): void {
    this['bucket' as any] = new GridFSBucket(this.mongoDbService.getDatabase());
  }

  public uploadStream(name: string, stream: stream.Readable): void {
    const bucket = this.bucket.openUploadStream(name);
    stream.pipe(bucket);
  }

  public downloadStream(name: string): stream.Readable {
    return this.bucket.openDownloadStreamByName(name);
  }

  public async getFile(name: string): Promise<GridFSFile> {
    const cursor = this.bucket.find({filename: name}, {limit: 1});
    return await cursor.next();
  }

  public async deleteFile(name: string): Promise<void> {
    const file = await this.getFile(name);
    if (file) {
      await this.bucket.delete(file._id);
    }
  }
}
