CREATE TABLE IF NOT EXISTS profile_resume_qr_links (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  profile_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  disabled_at TIMESTAMP NULL DEFAULT NULL,
  last_accessed_at TIMESTAMP NULL DEFAULT NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY profile_resume_qr_links_profile_unique (profile_id),
  UNIQUE KEY profile_resume_qr_links_token_hash_unique (token_hash),
  KEY profile_resume_qr_links_active_lookup (token_hash, disabled_at),
  CONSTRAINT fk_profile_resume_qr_links_profile
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_profile_resume_qr_links_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
