CREATE TABLE portfolio_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    profile_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(180) NOT NULL,
    slug VARCHAR(140) NOT NULL,
    summary VARCHAR(255) NULL,
    description TEXT NULL,
    category VARCHAR(100) NULL,
    skills_json JSON NULL,
    visibility ENUM('private', 'shared', 'public') NOT NULL DEFAULT 'private',
    featured TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY portfolio_items_profile_slug_unique (profile_id, slug),
    KEY portfolio_items_profile_id_index (profile_id),
    KEY portfolio_items_visibility_index (visibility),
    CONSTRAINT portfolio_items_profile_id_foreign
        FOREIGN KEY (profile_id) REFERENCES profiles(id)
        ON DELETE CASCADE,
    CONSTRAINT portfolio_items_created_by_foreign
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT portfolio_items_updated_by_foreign
        FOREIGN KEY (updated_by) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE portfolio_assets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    portfolio_item_id BIGINT UNSIGNED NOT NULL,
    asset_type ENUM('image', 'pdf', 'link') NOT NULL,
    file_path VARCHAR(255) NULL,
    external_url VARCHAR(500) NULL,
    label VARCHAR(180) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY portfolio_assets_portfolio_item_id_index (portfolio_item_id),
    CONSTRAINT portfolio_assets_portfolio_item_id_foreign
        FOREIGN KEY (portfolio_item_id) REFERENCES portfolio_items(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
