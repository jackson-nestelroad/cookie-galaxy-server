import {AdminMiddleware} from '../../middleware/admin';
import Busboy from 'busboy';
import {GridFsServiceInterface} from '../../services/interfaces/gridfs';
import {MiddlewareArray} from '../../../framework/middleware';
import http from 'http';

import {
  AuthenticationMiddleware,
  RequireAuthenticationMiddleware,
} from '../../middleware/authentication';
import {
  CompoundController,
  CompoundControllerConfig,
  ControllerConfig,
  MethodDispatcher,
  SimpleController,
  asyncRoute,
} from '../../../framework/controller';
import {
  DependencyInjectionKey,
  UsesDependencyInjection,
} from '../../../framework/dependency-injector';
import {Request, Response} from 'express';

/**
 * Controller for dynamically fetching images.
 */
export class FetchImageController extends SimpleController implements UsesDependencyInjection {
  public middleware: MiddlewareArray = [];

  public config: ControllerConfig = {
    ':name': asyncRoute(this.fetch, this),
  };

  private readonly gridFsService: GridFsServiceInterface;

  public inject: DependencyInjectionKey[] = ['gridFsService'];

  public async fetch(req: Request, res: Response) {
    // Check if file exists first to avoid uncaught exception that occurs due to stream forwarding.
    const file = await this.gridFsService.getFile(req.params.name);
    if (!file) {
      return res.status(404).send('Not found');
    }
    if (file.contentType) {
      res.setHeader('content-type', file.contentType);
    }
    this.gridFsService.downloadStream(req.params.name).pipe(res);
  }
}

/**
 * Controller for dynamically uploading images.
 */
export class ModifyImageController extends SimpleController implements UsesDependencyInjection {
  public middleware: MiddlewareArray = [
    AuthenticationMiddleware,
    RequireAuthenticationMiddleware,
    AdminMiddleware,
  ];

  public config: ControllerConfig = {
    ':name': new MethodDispatcher({
      post: this.upload,
    }),
  };

  private readonly gridFsService: GridFsServiceInterface;

  public inject: DependencyInjectionKey[] = ['gridFsService'];

  public upload(req: Request, res: Response) {
    if (!req.headers['content-type']) {
      return res.status(400).send('Content-Type header required');
    }
    const {name} = req.params;
    const busboy = new Busboy({
      headers: req.headers as {'content-type': string} & http.IncomingHttpHeaders,
    });

    // Only allow a single file upload.
    busboy.once('file', (fieldname, file, filename, encoding, mimetype) => {
      if (mimetype !== 'image/png') {
        return res.status(400).send('MIME type must be "image/png"');
      }

      // Delete existing file with same name before new upload.
      this.gridFsService.deleteFile(name)
        .then(() => {
          this.gridFsService.uploadStream(name, file);
        })
        .catch((err) => {
          res.status(500).send(err.message);
        });
    });
    busboy.on('error', (error) => {
      res.status(500).send((error as any)?.message ?? (error.toString() || error));
    });
    busboy.on('finish', () => res.send('Uploaded'));
    return req.pipe(busboy);
  }
}

export class ImageController extends CompoundController {
  public config: CompoundControllerConfig = [FetchImageController, ModifyImageController];
}
