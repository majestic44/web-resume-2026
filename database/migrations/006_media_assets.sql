CREATE TABLE media_assets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    profile_id BIGINT UNSIGNED NOT NULL,
    kind ENUM('image', 'pdf', 'file') NOT NULL DEFAULT 'file',
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(160) NOT NULL,
    size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
    public_path VARCHAR(500) NOT NULL,
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY media_assets_profile_id_index (profile_id),
    KEY media_assets_kind_index (kind),
    CONSTRAINT media_assets_profile_id_foreign
        FOREIGN KEY (profile_id) REFERENCES profiles(id)
        ON DELETE CASCADE,
    CONSTRAINT media_assets_created_by_foreign
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT media_assets_updated_by_foreign
        FOREIGN KEY (updated_by) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
