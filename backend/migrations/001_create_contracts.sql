CREATE TABLE contracts (
    id BIGSERIAL PRIMARY KEY,
    proposal_id BIGINT NOT NULL UNIQUE REFERENCES proposals(id),
    project_id BIGINT NOT NULL REFERENCES projects(id),
    client_id INTEGER NOT NULL REFERENCES users(id),
    freelancer_id INTEGER NOT NULL REFERENCES users(id),
    agreed_amount NUMERIC(12, 2) NOT NULL CHECK (agreed_amount >= 0),
    start_date DATE,
    end_date DATE,
    terms TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX contracts_project_id_idx ON contracts(project_id);
CREATE INDEX contracts_client_id_idx ON contracts(client_id);
CREATE INDEX contracts_freelancer_id_idx ON contracts(freelancer_id);
