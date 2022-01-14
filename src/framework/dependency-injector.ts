import {Service} from './service';

export type DependencyInjectionKey = string | number | symbol;

/**
 * Interface that specifies the object uses a server's dependency injection.
 */
export interface UsesDependencyInjection {
  /**
   * A string of attribute keys to look for in the injection service.
   *
   * The service must be registered in the dependency injector, and
   * the service is then assigned to `this[key]`.
   */
  readonly inject: DependencyInjectionKey[];
}

export type ServiceType = new() => Service;

interface ServiceNode {
  service: Service,
  initialized: boolean,
}

/**
 * A dependency injector responsible for injecting the same instance of a service
 * across multiple objects across the server.
 */
export class DependencyInjector {
  // Maps a key to the instance of the service to inject.
  private readonly services: Map<DependencyInjectionKey, ServiceNode> = new Map();

  /**
   * Registers a new service under the given key.
   * @param {DependencyInjectionKey} key The key used to search for the service
   * and for which attribute the service is assigned to when injecting onto objects.
   * @param {ServiceType} Service A constructor to be called to create an instance of
   * the service that should be injected for this key.
   */
  public register(key: DependencyInjectionKey, Service: ServiceType) {
    if (this.services.has(key)) {
      throw new Error(`Key "${key.toString()}" has already been registered`);
    }
    this.services.set(key, {service: new Service(), initialized: false});
  }

  /**
   * Prepares all registered dependencies for injection by initializing them and setting
   * up dependencies between each other.
   */
  public async prepareForInjection(): Promise<void> {
    // Could one day topologically sort to make sure dependencies up the chain are initialized
    // first. For now, just use order of registration.
    for (const {service, initialized} of this.services.values()) {
      const possibleInject = (service as unknown as UsesDependencyInjection).inject;
      if (possibleInject && Array.isArray(possibleInject)) {
        this.inject(service as unknown as UsesDependencyInjection);
      }

      if (!initialized) {
        if (service.asyncInitialize) {
          // eslint-disable-next-line no-await-in-loop
          await service.asyncInitialize();
        } else if (service.initialize) {
          service.initialize();
        }
      }
    }
  }

  /**
   * Injects all required services into the given object.
   * @param {UsesDependencyInjection} obj Some object with the `inject` property.
   */
  public inject(obj: UsesDependencyInjection): void {
    for (const key of obj.inject) {
      const node = this.services.get(key);
      if (!node) {
        throw new Error(
          `Service for key ${key.toString()} not registered on dependency injector`,
        );
      }
      obj[key] = node.service;
    }
  }
}
