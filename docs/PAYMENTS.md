# Contract payments

TalentBridge uses Razorpay for contract funding. Development and validation
should use Razorpay **test mode** only.

## Configuration

Backend configuration is read from `backend/.env`:

- `RAZORPAY_MODE=test` selects test credentials.
- `RAZORPAY_KEY_ID` is the public Checkout key ID.
- `RAZORPAY_KEY_SECRET` stays on the backend and is used for provider API and
  checkout signature verification.
- `RAZORPAY_WEBHOOK_SECRET` stays on the backend and verifies webhook
  signatures.

The repository's `backend/.env.example` contains placeholders, not usable
credentials. Never add secret values to frontend variables or source control.

## Funding flow

1. An authenticated client who owns an eligible contract requests a payment
   order with an `Idempotency-Key`.
2. The backend verifies contract ownership, amount/currency, payment state,
   and idempotency before creating a provider order.
3. If an order result is uncertain, a retry with the same idempotency key lets
   the backend reconcile the provider order by receipt; ambiguous or missing
   provider results are not treated as successful funding.
4. The frontend opens Razorpay Checkout using the returned public `keyId`,
   order ID, amount, and currency.
5. Checkout verification is sent to the backend. The backend verifies the
   signature and records it as verified, but leaves funding pending.
6. Signed provider webhooks are independently validated and deduplicated
   before the payment is marked funded.

An open or dismissed checkout is not confirmation that payment succeeded.
The application must rely on backend verification/provider confirmation for
the authoritative payment state.

## Testing guidance

Use test credentials and the payment tests under `backend/tests` for
regressions. Do not switch to live mode for local smoke tests. Real Checkout
and webhook delivery require credentials and a reachable callback endpoint;
the automated suite uses controlled test providers/database mocks.
