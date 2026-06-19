/**
 * Subscription plans. Tally is FREE — there are no plans, so nothing syncs to
 * Stripe on deploy and there is no paywall. Any future AI feature bills the end
 * user for their own usage (SPEC §2), not through a subscription here.
 */

export const subscriptionPlans = [] as const

export type SubscriptionPlanSlug = (typeof subscriptionPlans)[number] extends never
  ? string
  : (typeof subscriptionPlans)[number]['slug']
