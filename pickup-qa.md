# Pickup ordering verification

Predeployment verification completed locally on September 19, 2026.

## Customer flow

- Checkout offers pay at pickup or online card payment, with free local pickup.
- A preferred location is optional; orders without a location can be coordinated after placement.
- The default coordinator is Tone Velez at Admin@Truking.com; saved location contacts can override it.
- Customer notes, saved location instructions, and order-specific instructions appear in customer order tracking.
- Pay-at-pickup orders show nothing due online and their balance due at collection.

## Admin workflow

1. Add or edit locations, hours, contacts, and arrival instructions under **Pickup Locations**.
2. Open an order from **Orders**. Read the customer’s notes, assign a location if needed, and save order-specific instructions.
3. Mark the order **Ready for pickup**. The existing notification service sends the ready email when SMTP is configured.
4. Select **Picked up**. For an unpaid pickup order, confirm the exact payment was collected before clicking **Update**.

The order list supports pickup/shipping and pickup-status filters. CSV export follows both filters. Existing orders retain their saved location details when the location directory changes. Completed or cancelled orders cannot be reassigned to a different location.

## Verification completed

- Production build: `npm run build` — passed; existing large-chunk advisory remains.
- Regression suite: `cd server && npm test` — 15 tests passed. Stripe, email, and database methods are isolated in this suite.
- ESLint: checkout, confirmation, tracking, customer orders, pickup components, admin pickup/order/dashboard screens, and client API helpers — passed.
- Real Express/Mongoose integration against a temporary MongoDB instance: authorization, exact email matching (including `+` addresses), optional location checkout, inactive location rejection, preserved order snapshots and customer notes, location assignment, payment collection, and revenue accounting — passed.
- Browser walkthrough: guest pay-at-pickup checkout → confirmation; admin location assignment → saved instructions → ready for pickup → confirmed payment and collection; customer tracking reflects the final details — passed.
- Desktop and 390px mobile layouts: checkout, order details, location management, and tracking checked. No runtime errors or horizontal overflow observed.

No real customer records, payments, or emails were used. Stripe session creation was tested with a stub; live Stripe payment and SMTP delivery were not exercised.
