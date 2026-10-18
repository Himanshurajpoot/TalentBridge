BEGIN;

-- Add columns missing from the existing database schema.
ALTER TABLE contract_payments
    ADD COLUMN IF NOT EXISTS provider_transfer_reference TEXT,
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'created',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Preserve existing payment records with safe legacy idempotency keys.
UPDATE contract_payments
SET idempotency_key = 'legacy-payment-' || id::text
WHERE idempotency_key IS NULL;

-- Existing records have Razorpay order references but no provider
-- confirmation event in the current event history.
UPDATE contract_payments
SET status = 'funding_pending'
WHERE provider_order_reference IS NOT NULL;

ALTER TABLE contract_payments
    ALTER COLUMN idempotency_key SET NOT NULL;

-- Add missing validation constraints only if they do not already exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'contract_payments'::regclass
          AND conname = 'contract_payments_idempotency_key_key'
    ) THEN
        ALTER TABLE contract_payments
            ADD CONSTRAINT contract_payments_idempotency_key_key
            UNIQUE (idempotency_key);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'contract_payments'::regclass
          AND conname = 'contract_payments_idempotency_key_check'
    ) THEN
        ALTER TABLE contract_payments
            ADD CONSTRAINT contract_payments_idempotency_key_check
            CHECK (length(btrim(idempotency_key)) > 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'contract_payments'::regclass
          AND conname = 'contract_payments_status_check'
    ) THEN
        ALTER TABLE contract_payments
            ADD CONSTRAINT contract_payments_status_check
            CHECK (
                status IN (
                    'created',
                    'funding_pending',
                    'funded',
                    'release_pending',
                    'released',
                    'failed',
                    'refund_pending',
                    'partially_refunded',
                    'refunded',
                    'disputed',
                    'cancelled'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'contract_payments'::regclass
          AND conname = 'contract_payments_participants_fkey'
    ) THEN
        ALTER TABLE contract_payments
            ADD CONSTRAINT contract_payments_participants_fkey
            FOREIGN KEY (contract_id, client_id, freelancer_id)
            REFERENCES contracts(id, client_id, freelancer_id)
            ON DELETE RESTRICT;
    END IF;
END
$$;

-- Required query indexes.
CREATE INDEX IF NOT EXISTS contract_payments_status_idx
    ON contract_payments(status);

-- Provider references must be unique within a provider.
CREATE UNIQUE INDEX IF NOT EXISTS contract_payments_provider_order_reference_key
    ON contract_payments(provider, provider_order_reference)
    WHERE provider_order_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contract_payments_provider_payment_reference_key
    ON contract_payments(provider, provider_payment_reference)
    WHERE provider_payment_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contract_payments_provider_transfer_reference_key
    ON contract_payments(provider, provider_transfer_reference)
    WHERE provider_transfer_reference IS NOT NULL;

COMMIT;
