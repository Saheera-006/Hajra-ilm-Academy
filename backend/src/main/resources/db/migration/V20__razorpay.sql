CREATE TABLE razorpay_orders (
 checkout_id VARCHAR(36) PRIMARY KEY, order_id VARCHAR(80) NOT NULL UNIQUE,
 payment_id VARCHAR(80) UNIQUE, full_name VARCHAR(255) NOT NULL, age INT NOT NULL,
 email VARCHAR(255) NOT NULL, phone VARCHAR(40) NOT NULL, password_hash VARCHAR(255),
 batch_id BIGINT NOT NULL, course_id BIGINT NOT NULL, amount_paise BIGINT NOT NULL,
 billing_address VARCHAR(500) NOT NULL, gstin VARCHAR(20), status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
 fee_paise BIGINT, tax_paise BIGINT, refunded_paise BIGINT NOT NULL DEFAULT 0,
 student_id VARCHAR(40), user_id BIGINT, email_sent BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, paid_at TIMESTAMP NULL
);
