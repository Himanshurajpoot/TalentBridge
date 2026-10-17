CREATE INDEX IF NOT EXISTS idx_reviews_project_created_at
    ON reviews (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_created_at
    ON reviews (reviewee_id, created_at DESC);
