import {CookieGalaxyOrderUpdate} from './cart';

export interface PricingServiceInterface {
  /**
   * Updates and validates the pricing for the cart.
   * @param {CookieGalaxyOrderUpdate} cart Cart, without id.
   */
  updatePricing(cart: CookieGalaxyOrderUpdate): Promise<void>;
}
