import Stripe from "stripe";

/**
 * Stripe client created on first use.
 * Importing a route must not require STRIPE_SECRET_KEY during `next build`.
 * When the key is present, the client is constructed with the same options
 * as the previous module-level `new Stripe(...)`.
 */
export function lazyStripe(options?: Stripe.StripeConfig): Stripe {
  let client: Stripe | null = null;

  return new Proxy({} as Stripe, {
    get(_target, prop) {
      if (!client) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) {
          throw new Error("Missing STRIPE_SECRET_KEY");
        }
        client = new Stripe(key, options);
      }

      const value = (client as unknown as Record<PropertyKey, unknown>)[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}
