import cookieParser from 'cookie-parser';

import {
  AsyncMiddleware,
  MiddlewareArray,
  MiddlewareInstance,
  MiddlewareType,
} from './middleware';
import {
  CompoundController,
  CompoundControllerConfig,
  ControllerConfig,
  ControllerInstance,
  ControllerType,
  MethodDispatcher,
  SimpleController,
  asyncRoute,
} from './controller';
import {
  DependencyInjectionKey,
  DependencyInjector,
  ServiceType,
  UsesDependencyInjection,
} from './dependency-injector';
import express, {RequestHandler} from 'express';

export type ControllerMap = Record<string, ControllerType>;
export type MiddlewareMap = Record<string, MiddlewareArray>;
export type ServiceMap = Record<DependencyInjectionKey, ServiceType>;

interface MiddlewareNode {
  instance: MiddlewareInstance,
  handler: RequestHandler,
}

/**
 * A server for processing HTTP requests with responses.
 */
export abstract class Server {
  private app: express.Express;

  private dependencyInjector: DependencyInjector;

  /**
   * Collection of services to be initialized and registered on the server.
   */
  protected abstract readonly services: ServiceMap;

  /**
   * Collection of controllers to be initialized and registered on the server.
   */
  protected abstract readonly controllers: ControllerMap;

  private readonly controllerInstances: ControllerInstance[] = [];

  /**
   * Collection of middleware to be initialized and registered on the server.
   */
  protected abstract readonly middleware: MiddlewareMap;

  private readonly middlewareInstances: Record<string, MiddlewareNode> = {};

  public constructor() {
    this.app = express();
    this.app.use(express.urlencoded({extended: false}));
    this.app.use(express.json());
    this.app.use(cookieParser());
    this.dependencyInjector = new DependencyInjector();
  }

  /**
   * Starts the express server on the given port.
   * @param {number} port Port to listen on.
   */
  public async start(port: number): Promise<void> {
    // Register all services.
    for (const key of Object.keys(this.services)) {
      this.dependencyInjector.register(key, this.services[key]);
    }

    await this.dependencyInjector.prepareForInjection();

    // Register all middleware.
    for (const route of Object.keys(this.middleware)) {
      for (const MiddlewareType of this.middleware[route]) {
        // eslint-disable-next-line no-await-in-loop
        await this.registerMiddleware(route, MiddlewareType);
      }
    }

    // Register all controllers.
    for (const route of Object.keys(this.controllers)) {
      const ControllerType = this.controllers[route];
      // eslint-disable-next-line no-await-in-loop
      await this.registerController(route, ControllerType);
    }

    // Start the server.
    this.app.listen(port, () => {
      console.log(`Server started on http://localhost:${port}/`);
    });
  }

  // Possibly inject dependencies if interface is present.
  private async possiblyDependencyInject(obj: unknown): Promise<void> {
    const possibleInject = (obj as UsesDependencyInjection).inject;
    if (possibleInject && Array.isArray(possibleInject)) {
      this.dependencyInjector.inject(obj as UsesDependencyInjection);
    }
  }

  // Registers a simple controller.
  private async registerSimpleController(route: string, controller: SimpleController) {
    await this.possiblyDependencyInject(controller);

    const middlewareHandlers = await Promise.all(
      controller.middleware.map((Middleware) => this.getSingleMiddlewareHandler(Middleware)),
    );
    await this.registerControllerConfig(
      `/${route}`, controller.config, controller, middlewareHandlers,
    );
    this.controllerInstances.push(controller);
  }

  // Registers a compound controller by flattening it out, registering all nested controllers.
  private async registerCompoundController(route: string, controller: CompoundController) {
    await this.registerCompoundControllerConfig(route, controller.config);
    this.controllerInstances.push(controller);
  }

  // Registers a nested controller on the given route.
  private async registerNestedController(
    route: string, NestedController: ControllerType | CompoundControllerConfig,
  ) {
    if (typeof NestedController === 'function') {
      const nestedController = new NestedController();
      if (nestedController instanceof SimpleController) {
        // eslint-disable-next-line no-await-in-loop
        await this.registerSimpleController(route, nestedController);
      } else if (nestedController instanceof CompoundController) {
        // eslint-disable-next-line no-await-in-loop
        await this.registerCompoundController(route, nestedController);
      } else {
        throw new Error('Nested controller yielded an improper controller type');
      }
    } else {
      // eslint-disable-next-line no-await-in-loop
      await this.registerCompoundControllerConfig(route, NestedController);
    }
  }

  /**
   * Registers a compound controller configuration in the server's router.
   *
   * Used for recursion.
   * @param {string} route Base route to append new routes to.
   * @param {CompoundControllerConfig} config Configuration.
   */
  private async registerCompoundControllerConfig(route: string, config: CompoundControllerConfig) {
    if (Array.isArray(config)) {
      for (const NestedController of config) {
        this.registerNestedController(route, NestedController);
      }
    } else {
      for (const [nestedRoute, NestedController] of Object.entries(config)) {
        const joinedRoute = nestedRoute ? `${route}/${nestedRoute}` : route;
        this.registerNestedController(joinedRoute, NestedController);
      }
    }
  }

  /**
   * Registers a controller configuration in the server's router.
   *
   * Used for recursion.
   * @param {string} route Base route to append new routes to.
   * @param {ControllerConfig} config Configuration.
   * @param {Controller} controller Controller to run functions on.
   */
  private registerControllerConfig(
    route: string,
    config: ControllerConfig,
    controller: SimpleController,
    middlewareHandlers: RequestHandler[],
  ): void {
    for (const nestedRoute of Object.keys(config)) {
      const mergedRoute = nestedRoute ? `${route}/${nestedRoute}` : route;
      const nested = config[nestedRoute];
      if (typeof nested === 'function') {
        // Given a direct function, use it as a GET handler.
        this.app.get(mergedRoute, ...middlewareHandlers, nested.bind(controller));
      } else if (nested instanceof MethodDispatcher) {
        // Given a method dispatcher, so map every method for the route.
        for (const [method, handler] of Object.entries(nested.map)) {
          this.app[method](mergedRoute, ...middlewareHandlers, handler.bind(controller));
        }
      } else {
        // Given a nested configuration, use recursion.
        this.registerControllerConfig(mergedRoute, nested, controller, middlewareHandlers);
      }
    }
  }

  /**
   * Dynamically registers a controller in the server's router.
   * @param {string} route Route to attach controller to.
   * @param {ControllerType} Controller Controller type.
   */
  public async registerController(
    route: string, Controller: ControllerType,
  ): Promise<void> {
    const controller = new Controller();
    if (controller instanceof SimpleController) {
      await this.registerSimpleController(route, controller);
    } else if (controller instanceof CompoundController) {
      await this.registerCompoundController(route, controller);
    } else {
      throw new Error(`${Controller.name} is not a valid controller type`);
    }
  }

  /**
   * Dynamically registers a service in the server's dependency injector.
   * @param {DependencyInjectionKey} key Key of the service to inject on.
   * @param {ServiceType} service Service type to create.
   */
  public registerService(key: DependencyInjectionKey, service: ServiceType): void {
    this.dependencyInjector.register(key, service);
  }

  /**
   * Gets or creates the single middleware request handler for the middleware type.
   * @param {MiddlewareType} Middleware
   * @returns {Promise<RequestHandler>} Request handler for middleware.
   */
  private async getSingleMiddlewareHandler(Middleware: MiddlewareType): Promise<RequestHandler> {
    const existingHandler = Middleware.name ? this.middlewareInstances[Middleware.name] : undefined;
    if (existingHandler) {
      return existingHandler.handler;
    }

    const middleware = new Middleware();

    await this.possiblyDependencyInject(middleware);

    const handler: RequestHandler = middleware instanceof AsyncMiddleware
      ? asyncRoute(middleware.run, middleware)
      : middleware.run.bind(middleware);

    if (Middleware.name) {
      this.middlewareInstances[Middleware.name] = {instance: middleware, handler};
    }
    return handler;
  }

  /**
   * Dynamically registers middleware in the server's router.
   * @param {string} route Route to attach controller to.
   * @param {MiddlewareType} middleware Middleware type.
   */
  public async registerMiddleware(
    route: string, Middleware: MiddlewareType,
  ): Promise<void> {
    const handler = await this.getSingleMiddlewareHandler(Middleware);
    this.app.use(`/${route}`, handler);
  }
}
