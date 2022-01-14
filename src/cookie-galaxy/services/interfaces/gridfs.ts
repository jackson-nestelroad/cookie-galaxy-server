import {GridFSFile} from 'mongodb';
import stream from 'stream';

/**
 * Service for uploading and fetching images.
 */
export interface GridFsServiceInterface {
  /**
   * Uploads a stream by piping it into the GridFS bucket.
   * @param {string} name Name of the file.
   * @param {stream.Readable} stream Stream of data to upload.
   */
  uploadStream(name: string, stream: stream.Readable): void;

  /**
   * Downloads a file by exposing it as a stream.
   * @param {string} name Name of the file.
   * @returns {stream.Readable} Stream of data to download.
   */
  downloadStream(name: string): stream.Readable;

  /**
   * Fetches the first file by its file name.
   * @param {string} name Name of the file.
   * @returns {Promise<GridFSFile>} GridFS file.
   */
  getFile(name: string): Promise<GridFSFile>;

  /**
   * Deletes the first file by its name.
   * @param {string} name Name of the file.
   */
  deleteFile(name: string): Promise<void>;
}
