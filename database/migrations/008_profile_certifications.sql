CREATE TABLE profile_certifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    profile_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(180) NOT NULL,
    issuer VARCHAR(180) NOT NULL,
    status ENUM('active', 'in_progress', 'expired') NOT NULL DEFAULT 'active',
    issued_on DATE NULL,
    expires_on DATE NULL,
    credential_id VARCHAR(160) NULL,
    credential_url VARCHAR(500) NULL,
    notes TEXT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY profile_certifications_profile_id_index (profile_id),
    KEY profile_certifications_status_index (status),
    CONSTRAINT profile_certifications_profile_id_foreign
        FOREIGN KEY (profile_id) REFERENCES profiles(id)
        ON DELETE CASCADE,
    CONSTRAINT profile_certifications_created_by_foreign
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT profile_certifications_updated_by_foreign
        FOREIGN KEY (updated_by) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
