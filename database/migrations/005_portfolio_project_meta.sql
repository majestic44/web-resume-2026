ALTER TABLE portfolio_items
    ADD COLUMN project_type VARCHAR(120) NULL AFTER category,
    ADD COLUMN project_progress ENUM('planned', 'in_progress', 'completed', 'on_hold') NULL AFTER project_type;
