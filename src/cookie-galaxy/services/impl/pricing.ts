import {CookieGalaxyOrderUpdate} from '../interfaces/cart';
import {ItemServiceInterface} from '../interfaces/item';
import {PricingServiceInterface} from '../interfaces/pricing';
import {Service} from '../../../framework/service';

import {CookieGalaxyItem, CookieGalaxyOrderItemEntry} from 'cookie-galaxy';
import {
  DependencyInjectionKey,
  UsesDependencyInjection,
} from '../../../framework/dependency-injector';

export class PricingService implements PricingServiceInterface, Service, UsesDependencyInjection {
  id = Symbol('PricingService');

  private readonly itemService: ItemServiceInterface;

  public inject: DependencyInjectionKey[] = ['itemService'];

  private getMultiplierForCollection(collection: CookieGalaxyOrderItemEntry['collection']): number {
    switch (collection) {
      case 'single': return 1;
      case 'halfDozen': return 6;
      case 'dozen': return 12;
      default: throw new Error(`Invalid collection: ${collection}`);
    }
  }

  private calculatePriceForItem(item: CookieGalaxyItem, entry: CookieGalaxyOrderItemEntry): number {
    const pricePerOneCollection = item.price[entry.collection]
      ?? entry.pricePerOne * this.getMultiplierForCollection(entry.collection);
    entry.pricePerOne = pricePerOneCollection / this.getMultiplierForCollection(entry.collection);
    return pricePerOneCollection * entry.quantity;
  }

  public async updatePricing(cart: CookieGalaxyOrderUpdate): Promise<void> {
    const items = (await this.itemService.getItems(cart.items.map((item) => item.itemId)))
      .reduce((obj, item) => {
        obj[item._id.toString()] = item;
        return obj;
      }, {} as Record<string, CookieGalaxyItem>);

    cart.price.currency = 'USD';
    cart.price.base = 0;

    for (const entry of cart.items) {
      cart.price.base += this.calculatePriceForItem(items[entry.itemId.toString()], entry);
    }

    cart.price.tax = Math.ceil(cart.price.base * 0.0625);
    cart.price.shipping = cart.items.reduce((shipping, item) => shipping + item.quantity, 0);
    cart.price.shipping *= 100;

    // TODO: Validate discunts.
    cart.price.discount = [];
  }
}
