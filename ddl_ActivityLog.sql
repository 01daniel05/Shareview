
CREATE TABLE activity_logs
(
    id            BIGINT AUTO_INCREMENT NOT NULL,
    action        VARCHAR(255)          NOT NULL,
    `description` TEXT                  NULL,
    details       TEXT                  NULL,
    user_id       BIGINT                NULL,
    target_id     BIGINT                NULL,
    target_type   VARCHAR(255)          NULL,
    ip_address    VARCHAR(255)          NULL,
    user_agent    VARCHAR(255)          NULL,
    is_successful BIT(1)                NULL,
    error_message TEXT                  NULL,
    severity      VARCHAR(255)          NULL,
    created_at    datetime              NULL,
    updated_at    datetime              NULL,
    CONSTRAINT pk_activity_logs PRIMARY KEY (id)
);

ALTER TABLE activity_logs
    ADD CONSTRAINT FK_ACTIVITY_LOGS_ON_USER FOREIGN KEY (user_id) REFERENCES users (id);