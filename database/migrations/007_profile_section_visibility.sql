ALTER TABLE profiles
    ADD COLUMN show_documents TINYINT(1) NOT NULL DEFAULT 1 AFTER headline,
    ADD COLUMN show_portfolio TINYINT(1) NOT NULL DEFAULT 1 AFTER show_documents,
    ADD COLUMN show_certifications TINYINT(1) NOT NULL DEFAULT 0 AFTER show_portfolio,
    ADD COLUMN show_references TINYINT(1) NOT NULL DEFAULT 0 AFTER show_certifications;
