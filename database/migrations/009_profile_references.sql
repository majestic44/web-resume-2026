CREATE TABLE IF NOT EXISTS profile_references (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  profile_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  title VARCHAR(160) NULL,
  company VARCHAR(160) NULL,
  relationship_label VARCHAR(160) NULL,
  email VARCHAR(200) NULL,
  phone VARCHAR(80) NULL,
  reference_text TEXT NULL,
  contact_note TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_profile_references_profile (profile_id),
  KEY idx_profile_references_created_by (created_by),
  KEY idx_profile_references_updated_by (updated_by),
  CONSTRAINT fk_profile_references_profile
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_profile_references_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_profile_references_updated_by
    FOREIGN KEY (updated_by) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
