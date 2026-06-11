CREATE TABLE document_drafts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT UNSIGNED NOT NULL,
    content_json JSON NOT NULL,
    source_updated_at DATETIME NULL,
    saved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version_id VARCHAR(64) NOT NULL,
    UNIQUE KEY document_drafts_document_id_unique (document_id),
    UNIQUE KEY document_drafts_version_id_unique (version_id),
    CONSTRAINT document_drafts_document_id_foreign
        FOREIGN KEY (document_id) REFERENCES documents(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE document_draft_versions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT UNSIGNED NOT NULL,
    version_id VARCHAR(64) NOT NULL,
    content_json JSON NOT NULL,
    source_updated_at DATETIME NULL,
    saved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY document_draft_versions_document_id_index (document_id),
    KEY document_draft_versions_saved_at_index (saved_at),
    CONSTRAINT document_draft_versions_document_id_foreign
        FOREIGN KEY (document_id) REFERENCES documents(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

