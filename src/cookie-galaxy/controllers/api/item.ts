import {AdminMiddleware} from '../../middleware/admin';
import {CookieGalaxyItem} from 'cookie-galaxy';
import {MiddlewareArray} from '../../../framework/middleware';
import {ObjectId} from 'mongodb';

import {AttributeValidator, BodyValidationMetadata, validateBody} from './util/body-validation';
import {
  AuthenticatedRequest,
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
import {ItemServiceInterface, NewCookieGalaxyItem} from '../../services/interfaces/item';
import {Request, Response} from 'express';

/**
 * Controller for public operations on items.
 */
export class PublicItemController extends SimpleController implements UsesDependencyInjection {
  public middleware: MiddlewareArray = [];

  public config: ControllerConfig = {
    search: asyncRoute(this.getItems, this),
    multiple: asyncRoute(this.getMultipleItems, this),
  };

  private readonly itemService: ItemServiceInterface;

  public inject: DependencyInjectionKey[] = ['itemService'];

  public async getItems(req: Request, res: Response) {
    const {query, keywords} = req.query;
    let items: CookieGalaxyItem[];
    try {
      if (!query && !keywords) {
        items = await this.itemService.getAllItems();
      } else {
        items = await this.itemService.searchItems(
          query as string,
          keywords && typeof keywords === 'string' ? keywords.split(',') : [],
        );
      }
    } catch (err) {
      return res.status(400).send(err.message ?? err);
    }
    return res.json(items);
  }

  public async getMultipleItems(req: Request, res: Response) {
    const {ids} = req.query;
    if (!ids) {
      return res.json([]);
    }
    let idsArray: ObjectId[];
    try {
      idsArray = typeof ids !== 'string'
        ? []
        : ids.split(',').map((id) => new ObjectId(id));
    } catch (err) {
      return res.send(400).send('Invalid id');
    }

    const items = await this.itemService.getItems(idsArray);
    return res.json(items);
  }
}

/**
 * Controller for administrative operations on items.
 */
export class AdminItemController extends SimpleController implements UsesDependencyInjection {
  public middleware: MiddlewareArray = [
    AuthenticationMiddleware,
    RequireAuthenticationMiddleware,
    AdminMiddleware,
  ];

  public config: ControllerConfig = {
    create: new MethodDispatcher({
      post: asyncRoute(this.createItem, this),
    }),
    ':id': new MethodDispatcher({
      get: asyncRoute(this.getItem, this),
      put: asyncRoute(this.updateItem, this),
      delete: asyncRoute(this.deleteItem, this),
    }),
  };

  private readonly itemService: ItemServiceInterface;

  public inject: DependencyInjectionKey[] = ['itemService'];

  private readonly itemValidator: BodyValidationMetadata<NewCookieGalaxyItem> = {
    required: {
      name: AttributeValidator.String,
      description: AttributeValidator.String,
      mainIngredients: AttributeValidator.Array(AttributeValidator.String),
      keywords: AttributeValidator.Array(AttributeValidator.String),
      price: AttributeValidator.Object<NewCookieGalaxyItem['price']>({
        required: {
          single: AttributeValidator.PositiveNumber,
          halfDozen: AttributeValidator.PositiveNumber,
          dozen: AttributeValidator.PositiveNumber,
        },
      }),
    },
    optional: {
      deleted: AttributeValidator.Boolean,
    },
  } as const;

  public async createItem(req: AuthenticatedRequest, res: Response) {
    const {body} = req;
    try {
      validateBody(body, this.itemValidator);
    } catch (err) {
      return res.status(400).send(err.message);
    }

    const newItemId = await this.itemService.createItem(body);
    const newItem = await this.itemService.getItem(newItemId);
    return res.status(201).json(newItem);
  }

  public async getItem(req: AuthenticatedRequest, res: Response) {
    let itemId: ObjectId;

    try {
      itemId = new ObjectId(req.params.id);
    } catch (err) {
      return res.status(400).send('Invalid id');
    }

    const item = await this.itemService.getItem(itemId);
    if (!item) {
      return res.status(404).send('Item does not exist');
    }

    return res.json(item);
  }

  public async updateItem(req: AuthenticatedRequest, res: Response) {
    const {body} = req;
    try {
      validateBody(body, this.itemValidator);
    } catch (err) {
      return res.status(400).send(err.message);
    }

    let itemId: ObjectId;
    try {
      itemId = new ObjectId(req.params.id);
    } catch (err) {
      return res.status(400).send('Invalid id');
    }

    const existingItem = await this.itemService.getItem(itemId);
    if (!existingItem) {
      return res.status(404).send('Item does not exist');
    }

    await this.itemService.updateItem(itemId, body);
    return res.status(200).send();
  }

  public async deleteItem(req: AuthenticatedRequest, res: Response) {
    let itemId: ObjectId;
    try {
      itemId = new ObjectId(req.params.id);
    } catch (err) {
      return res.status(400).send('Invalid id');
    }

    await this.itemService.deleteItem(itemId);
    return res.status(200).send();
  }
}

/**
 * Controller for all operations on items.
 */
export class ItemController extends CompoundController {
  public config: CompoundControllerConfig = [PublicItemController, AdminItemController];
}
