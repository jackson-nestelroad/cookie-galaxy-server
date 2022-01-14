import {AuthenticationServiceInterface} from '../../services/interfaces/authentication';
import {CartServiceInterface} from '../../services/interfaces/cart';
import {MiddlewareArray} from '../../../framework/middleware';
import {MongoDbServiceInterface} from '../../services/interfaces/mongodb';
import {UserServiceInterface} from '../../services/interfaces/user';
import bcrypt from 'bcrypt';

import {AttributeValidator, BodyValidationMetadata, validateBody} from './util/body-validation';
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
import {Request, Response} from 'express';

interface LoginBody {
  email: string,
  password: string,
}

interface RegisterBody extends LoginBody {
  name: {
    first: string,
    last: string,
  }
}

/**
 * Controller for operations involving users, such as logging in and registering.
 */
export class UserController extends SimpleController implements UsesDependencyInjection {
  public middleware: MiddlewareArray = [];

  public config: ControllerConfig = {
    register: new MethodDispatcher({
      post: asyncRoute(this.register, this),
    }),
    login: new MethodDispatcher({
      post: asyncRoute(this.login, this),
    }),
    logout: new MethodDispatcher({
      post: asyncRoute(this.logout, this),
    }),
  };

  private readonly authService: AuthenticationServiceInterface;

  private readonly mongoDbService: MongoDbServiceInterface;

  private readonly cartService: CartServiceInterface;

  private readonly userService: UserServiceInterface;

  public inject: DependencyInjectionKey[] = [
    'authService',
    'mongoDbService',
    'cartService',
    'userService',
  ];

  private readonly passwordRegex: RegExp = /^.*(?=.{6,})(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*+]).*$/;

  private readonly loginBodyValidator: BodyValidationMetadata<LoginBody> = {
    required: {
      email: AttributeValidator.String,
      password: AttributeValidator.String,
    },
  } as const;

  private readonly registerBodyValidator: BodyValidationMetadata<RegisterBody> = {
    required: {
      ...this.loginBodyValidator.required,
      name: AttributeValidator.Object<RegisterBody['name']>({
        required: {
          first: AttributeValidator.String,
          last: AttributeValidator.String,
        },
      }),
    },
  } as const;

  public async register(req: Request, res: Response) {
    const {body} = req;
    try {
      validateBody(body, this.registerBodyValidator);
    } catch (err) {
      return res.status(400).send(err.message);
    }
    const oldUser = await this.userService.getUserByEmail(body.email);
    if (oldUser) {
      return res.status(409).send('Email is already registered to an account');
    }
    if (!this.passwordRegex.test(body.password)) {
      return res.status(409).send(
        // eslint-disable-next-line max-len
        'Password must be at least six characters, have one uppercase letter, have one number, and have one special character',
      );
    }
    try {
      const newUserId = await this.mongoDbService.transaction(async (session) => {
        const encryptedPassword = await bcrypt.hash(body.password, 10);
        const newCartId = await this.cartService.createCart({session});
        return await this.userService.createUser({
          email: body.email.toLowerCase(),
          password: encryptedPassword,
          name: {
            first: body.name.first,
            last: body.name.last,
          },
          registeredAt: new Date(),
          cartId: newCartId,
          isAdmin: false,
        }, {session});
      });

      const newUser = await this.userService.getUserById(newUserId);
      const token = this.authService.createToken(newUser._id);
      res.cookie('token', token, {httpOnly: true});
      return res.status(201).json(newUser);
    } catch (err) {
      return res.status(400).send(err.message);
    }
  }

  public async login(req: Request, res: Response) {
    const {body} = req;
    try {
      validateBody(body, this.loginBodyValidator);
    } catch (err) {
      return res.status(400).send(err.message);
    }

    const {email, password} = body;
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      return res.status(400).send('Email is not registered');
    }

    if (!await bcrypt.compare(password, user.password)) {
      return res.status(400).send('Wrong password');
    }

    const token = this.authService.createToken(user._id);
    res.cookie('token', token, {httpOnly: true});
    return res.status(200).json(user);
  }

  public async logout(req: Request, res: Response) {
    res.clearCookie('token');
    return res.status(200).send('Logged out');
  }
}
