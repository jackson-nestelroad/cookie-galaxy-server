/**
 * A service that can be dependency injected into some other class.
 *
 * Services house common methods and states that can be shared across
 * various components of a server.
 */
export interface Service {
  id: Symbol;
  asyncInitialize?(): Promise<void>;
  initialize?(): void;
}
