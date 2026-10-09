ALTER TABLE contracts
    ADD CONSTRAINT contracts_payment_participants_key
    UNIQUE (id, client_id, freelancer_id);

CREATE TABLE contract_payments (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL,
    client_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    agreed_amount_snapshot NUMERIC(12, 2) NOT NULL
        CHECK (agreed_amount_snapshot >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR'
        CHECK (currency ~ '^[A-Z]{3}$'),
    provider TEXT NOT NULL
        CHECK (length(btrim(provider)) > 0),
    provider_order_reference TEXT
        CHECK (
            provider_order_reference IS NULL
            OR length(btrim(provider_order_reference)) > 0
        ),
    provider_payment_reference TEXT
        CHECK (
            provider_payment_reference IS NULL
            OR length(btrim(provider_payment_reference)) > 0
        ),
    provider_transfer_reference TEXT
        CHECK (
            provider_transfer_reference IS NULL
            OR length(btrim(provider_transfer_reference)) > 0
        ),
    idempotency_key TEXT NOT NULL UNIQUE
        CHECK (length(btrim(idempotency_key)) > 0),
    status TEXT NOT NULL DEFAULT 'created'
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
        ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT contract_payments_id_provider_key
        UNIQUE (id, provider),
    CONSTRAINT contract_payments_participants_fkey
        FOREIGN KEY (contract_id, client_id, freelancer_id)
        REFERENCES contracts(id, client_id, freelancer_id)
        ON DELETE RESTRICT,
    CONSTRAINT contract_payments_client_id_fkey
        FOREIGN KEY (client_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT contract_payments_freelancer_id_fkey
        FOREIGN KEY (freelancer_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
);

CREATE INDEX contract_payments_contract_id_idx
    ON contract_payments(contract_id);
CREATE INDEX contract_payments_client_id_idx
    ON contract_payments(client_id);
CREATE INDEX contract_payments_freelancer_id_idx
    ON contract_payments(freelancer_id);
CREATE INDEX contract_payments_status_idx
    ON contract_payments(status);
CREATE UNIQUE INDEX contract_payments_provider_order_reference_key
    ON contract_payments(provider, provider_order_reference)
    WHERE provider_order_reference IS NOT NULL;
CREATE UNIQUE INDEX contract_payments_provider_payment_reference_key
    ON contract_payments(provider, provider_payment_reference)
    WHERE provider_payment_reference IS NOT NULL;
CREATE UNIQUE INDEX contract_payments_provider_transfer_reference_key
    ON contract_payments(provider, provider_transfer_reference)
    WHERE provider_transfer_reference IS NOT NULL;

CREATE TABLE contract_payment_events (
    id BIGSERIAL PRIMARY KEY,
    contract_payment_id BIGINT NOT NULL,
    provider TEXT NOT NULL
        CHECK (length(btrim(provider)) > 0),
    provider_event_reference TEXT,
    source TEXT NOT NULL
        CHECK (source IN ('api', 'provider_webhook', 'system', 'admin')),
    event_type TEXT NOT NULL
        CHECK (length(btrim(event_type)) > 0),
    amount NUMERIC(12, 2)
        CHECK (amount IS NULL OR amount >= 0),
    currency VARCHAR(3)
        CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
    event_data JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(event_data) = 'object'),
    occurred_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT contract_payment_events_payment_provider_fkey
        FOREIGN KEY (contract_payment_id, provider)
        REFERENCES contract_payments(id, provider)
        ON DELETE RESTRICT,
    CONSTRAINT contract_payment_events_provider_reference_check
        CHECK (
            provider_event_reference IS NULL
            OR length(btrim(provider_event_reference)) > 0
        ),
    CONSTRAINT contract_payment_events_webhook_reference_check
        CHECK (
            source <> 'provider_webhook'
            OR provider_event_reference IS NOT NULL
        )
);

CREATE INDEX contract_payment_events_payment_id_idx
    ON contract_payment_events(contract_payment_id);
CREATE INDEX contract_payment_events_type_created_at_idx
    ON contract_payment_events(event_type, created_at);
CREATE UNIQUE INDEX contract_payment_events_provider_reference_key
    ON contract_payment_events(provider, provider_event_reference)
    WHERE provider_event_reference IS NOT NULL;

CREATE FUNCTION prevent_contract_payment_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Contract payment events are append-only';
END;
$$;

CREATE TRIGGER contract_payment_events_no_update_or_delete
    BEFORE UPDATE OR DELETE ON contract_payment_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_contract_payment_event_mutation();

CREATE TRIGGER contract_payment_events_no_truncate
    BEFORE TRUNCATE ON contract_payment_events
    FOR EACH STATEMENT
    EXECUTE FUNCTION prevent_contract_payment_event_mutation();

COMMENT ON COLUMN contract_payments.status IS
    'Funding and transfer states such as funded or released must only be set after provider confirmation.';
COMMENT ON COLUMN contract_payment_events.event_data IS
    'Sanitized non-sensitive event metadata only; never store credentials or card data.';
