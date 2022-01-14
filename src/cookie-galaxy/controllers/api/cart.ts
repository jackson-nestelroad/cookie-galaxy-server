import {CookieGalaxyCompletedOrder} from 'cookie-galaxy';
import {MiddlewareArray} from '../../../framework/middleware';
import {MongoDbServiceInterface} from '../../services/interfaces/mongodb';
import {PricingServiceInterface} from '../../services/interfaces/pricing';
import {Response} from 'express';

import {AttributeValidator, BodyValidationMetadata, validateBody} from './util/body-validation';
import {
  AuthenticatedRequest,
  AuthenticationMiddleware,
  RequireAuthenticationMiddleware,
} from '../../middleware/authentication';
import {CartServiceInterface, CookieGalaxyOrderUpdate} from '../../services/interfaces/cart';
import {
  ControllerConfig,
  MethodDispatcher,
  SimpleController,
  asyncRoute,
} from '../../../framework/controller';
import {
  DependencyInjectionKey,
  UsesDependencyInjection,
} from '../../../framework/dependency-injector';
import {NewCookieGalaxyOrder, OrderServiceInterface} from '../../services/interfaces/order';

type CompletedCart = Omit<CookieGalaxyCompletedOrder, 'userId' | 'orderedAt'>;

/**
 * Controller for operations on a user's cart, or current incomplete order.
 */
export class CartController extends SimpleController implements UsesDependencyInjection {
  public middleware: MiddlewareArray = [
    AuthenticationMiddleware,
    RequireAuthenticationMiddleware,
  ];

  public config: ControllerConfig = {
    '': new MethodDispatcher({
      get: asyncRoute(this.getCart, this),
      put: asyncRoute(this.updateCart, this),
    }),
    purchase: new MethodDispatcher({
      post: asyncRoute(this.purchase, this),
    }),
  };

  private readonly mongoDbService: MongoDbServiceInterface;

  private readonly cartService: CartServiceInterface;

  private readonly orderService: OrderServiceInterface;

  private readonly pricingService: PricingServiceInterface;

  public inject: DependencyInjectionKey[] = [
    'mongoDbService',
    'cartService',
    'orderService',
    'pricingService',
  ];

  public async getCart(req: AuthenticatedRequest, res: Response) {
    const cart = await this.cartService.getCart(req.user.cartId);
    if (!cart) {
      return res.status(500).send('No cart');
    }
    return res.json(cart);
  }

  private readonly orderAttributeValidators = {
    items: AttributeValidator.Array(
      AttributeValidator.Object<CookieGalaxyOrderUpdate['items'][0]>({
        required: {
          itemId: AttributeValidator.ObjectId,
          collection: AttributeValidator.StringEnum(['single', 'halfDozen', 'dozen']),
          pricePerOne: AttributeValidator.Number,
          quantity: AttributeValidator.Number,
        },
      }),
    ),
    price: AttributeValidator.Object<CookieGalaxyOrderUpdate['price']>({
      required: {
        currency: AttributeValidator.String,
        base: AttributeValidator.Number,
      },
      optional: {
        tax: AttributeValidator.Number,
        shipping: AttributeValidator.Number,
        discount: AttributeValidator.Array(
          AttributeValidator.Object<CookieGalaxyOrderUpdate['price']['discount'][0]>({
            required: {
              description: AttributeValidator.String,
              amount: AttributeValidator.Number,
            },
            optional: {
              code: AttributeValidator.String,
              percentage: AttributeValidator.Boolean,
              canStack: AttributeValidator.Boolean,
            },
          }),
        ),
      },
    }),
    shippingAddress: AttributeValidator.Object<CookieGalaxyOrderUpdate['shippingAddress']>({
      required: {
        firstLine: AttributeValidator.String,
        city: AttributeValidator.String,
        state: AttributeValidator.String,
        zipCode: AttributeValidator.String,
      },
      optional: {
        secondLine: AttributeValidator.String,
      },
    }),
  };

  private readonly cartValidator: BodyValidationMetadata<CookieGalaxyOrderUpdate> = {
    required: {
      items: this.orderAttributeValidators.items,
      price: this.orderAttributeValidators.price,
    },
    optional: {
      shippingAddress: this.orderAttributeValidators.shippingAddress,
    },
  };

  private readonly orderValidator: BodyValidationMetadata<CompletedCart> = {
    required: {
      _id: AttributeValidator.ObjectId,
      items: this.orderAttributeValidators.items,
      price: this.orderAttributeValidators.price,
      shippingAddress: this.orderAttributeValidators.shippingAddress,
    },
  };

  public async updateCart(req: AuthenticatedRequest, res: Response) {
    const {body} = req;
    try {
      validateBody(body, this.cartValidator);
    } catch (err) {
      return res.status(400).send(err.message);
    }

    await this.pricingService.updatePricing(body);

    await this.cartService.updateCart(req.user.cartId, body);
    return res.status(200).send(body);
  }

  public async purchase(req: AuthenticatedRequest, res: Response) {
    const cart = await this.cartService.getCart(req.user.cartId);
    if (!cart) {
      return res.status(500).send('No cart');
    }

    try {
      validateBody(cart, this.orderValidator);
    } catch (err) {
      return res.status(400).send(`Cart is incomplete: ${err.message}`);
    }

    if (cart.items.length === 0) {
      return res.status(409).send('Cart is empty');
    }
    if (cart.price.base === 0) {
      return res.status(409).send('Nothing to buy');
    }

    try {
      const result = await this.mongoDbService.transaction(async (session) => {
        delete cart._id;
        const newOrderId = await this.orderService.createOrder(
          cart as NewCookieGalaxyOrder, req.user._id, {session},
        );
        const cartId = await this.cartService.resetCart(req.user.cartId, {session});
        const newCart = await this.cartService.getCart(cartId, {session});
        return {
          orderId: newOrderId,
          cart: newCart,
        };
      });
      return res.status(201).json(result);
    } catch (err) {
      return res.status(409).send(err.message);
    }
  }
}
