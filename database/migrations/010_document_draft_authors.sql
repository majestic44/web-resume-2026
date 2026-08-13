ALTER TABLE document_drafts
  ADD COLUMN saved_by BIGINT UNSIGNED NULL AFTER version_id,
  ADD KEY document_drafts_saved_by_index (saved_by),
  ADD CONSTRAINT document_drafts_saved_by_foreign
    FOREIGN KEY (saved_by) REFERENCES users(id)
    ON DELETE SET NULL;

ALTER TABLE document_draft_versions
  ADD COLUMN saved_by BIGINT UNSIGNED NULL AFTER saved_at,
  ADD KEY document_draft_versions_saved_by_index (saved_by),
  ADD CONSTRAINT document_draft_versions_saved_by_foreign
    FOREIGN KEY (saved_by) REFERENCES users(id)
    ON DELETE SET NULL;
