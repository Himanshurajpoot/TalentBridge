BEGIN;

ALTER TABLE contracts
DROP CONSTRAINT contracts_status_check;

ALTER TABLE contracts
ADD CONSTRAINT contracts_status_check
CHECK (status IN ('active', 'work_submitted', 'completed', 'cancelled'));

CREATE TABLE contract_work_submissions (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL UNIQUE REFERENCES contracts(id),
    freelancer_id INTEGER NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    submission_url TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX contract_work_submissions_freelancer_id_idx
    ON contract_work_submissions(freelancer_id);

COMMIT;