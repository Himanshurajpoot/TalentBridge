CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_reviewer_reviewee_project
    ON reviews (reviewer_id, reviewee_id, project_id);
