BEGIN;

ALTER TABLE contract_work_submissions
    DROP CONSTRAINT contract_work_submissions_contract_id_fkey;

ALTER TABLE contract_work_submissions
    ADD CONSTRAINT contract_work_submissions_contract_id_fkey
    FOREIGN KEY (contract_id)
    REFERENCES contracts(id)
    ON DELETE CASCADE;

COMMIT;
