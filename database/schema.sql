-- ============================================================
--  schema.sql
--  E-Commerce Clickstream Analyzer — MySQL Database Schema
--  Database: ecommerce_db
-- ============================================================

CREATE DATABASE IF NOT EXISTS ecommerce_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ecommerce_db;

-- ────────────────────────────────────────────────────────────
--  TABLE: categories
--  Stores product categories (Electronics, Clothing, etc.)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    category_id   INT           NOT NULL AUTO_INCREMENT,
    category_name VARCHAR(100)  NOT NULL,
    description   TEXT,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (category_id),
    UNIQUE KEY uq_category_name (category_name)
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
--  TABLE: users
--  Registered customers of the e-commerce platform
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    user_id       INT           NOT NULL AUTO_INCREMENT,
    username      VARCHAR(50)   NOT NULL,
    email         VARCHAR(150)  NOT NULL,
    password_hash VARCHAR(255)  NOT NULL,
    full_name     VARCHAR(150),
    city          VARCHAR(100),
    state         VARCHAR(100),
    country       VARCHAR(100)  NOT NULL DEFAULT 'India',
    device        VARCHAR(50),
    browser       VARCHAR(50),
    is_active     TINYINT(1)    NOT NULL DEFAULT 1,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login    DATETIME,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_email (email),
    UNIQUE KEY uq_username (username)
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
--  TABLE: products
--  Product catalog
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    product_id    INT             NOT NULL AUTO_INCREMENT,
    product_name  VARCHAR(200)    NOT NULL,
    category_id   INT             NOT NULL,
    brand         VARCHAR(100),
    price         DECIMAL(10, 2)  NOT NULL,
    stock_qty     INT             NOT NULL DEFAULT 0,
    rating        DECIMAL(3, 2),
    is_active     TINYINT(1)      NOT NULL DEFAULT 1,
    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id),
    KEY idx_category (category_id),
    KEY idx_price (price),
    CONSTRAINT fk_product_category
        FOREIGN KEY (category_id) REFERENCES categories (category_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
--  TABLE: sessions
--  Tracks each unique browsing session per user
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    session_id    VARCHAR(64)   NOT NULL,
    user_id       INT           NOT NULL,
    ip_address    VARCHAR(45),
    device        VARCHAR(50),
    browser       VARCHAR(50),
    start_time    DATETIME      NOT NULL,
    end_time      DATETIME,
    duration_sec  INT,              -- computed: end_time - start_time
    is_converted  TINYINT(1)    NOT NULL DEFAULT 0,  -- 1 if purchase happened
    PRIMARY KEY (session_id),
    KEY idx_session_user (user_id),
    KEY idx_session_start (start_time),
    CONSTRAINT fk_session_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
--  TABLE: orders
--  Purchase transactions
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    order_id      INT             NOT NULL AUTO_INCREMENT,
    user_id       INT             NOT NULL,
    session_id    VARCHAR(64),
    order_date    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount  DECIMAL(12, 2)  NOT NULL,
    status        ENUM('pending','processing','shipped','delivered','cancelled')
                  NOT NULL DEFAULT 'pending',
    payment_mode  VARCHAR(50),
    city          VARCHAR(100),
    PRIMARY KEY (order_id),
    KEY idx_order_user (user_id),
    KEY idx_order_date (order_date),
    CONSTRAINT fk_order_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_order_session
        FOREIGN KEY (session_id) REFERENCES sessions (session_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
--  TABLE: order_items
--  Line items for each order
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
    item_id       INT             NOT NULL AUTO_INCREMENT,
    order_id      INT             NOT NULL,
    product_id    INT             NOT NULL,
    quantity      INT             NOT NULL DEFAULT 1,
    unit_price    DECIMAL(10, 2)  NOT NULL,
    PRIMARY KEY (item_id),
    KEY idx_oi_order (order_id),
    KEY idx_oi_product (product_id),
    CONSTRAINT fk_oi_order
        FOREIGN KEY (order_id) REFERENCES orders (order_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_oi_product
        FOREIGN KEY (product_id) REFERENCES products (product_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
--  TABLE: clickstream_logs
--  Raw clickstream events (also mirrored in HDFS)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clickstream_logs (
    log_id        BIGINT        NOT NULL AUTO_INCREMENT,
    user_id       INT           NOT NULL,
    session_id    VARCHAR(64)   NOT NULL,
    event_time    DATETIME(3)   NOT NULL,      -- millisecond precision
    ip_address    VARCHAR(45),
    device        VARCHAR(50),
    browser       VARCHAR(50),
    action        VARCHAR(50)   NOT NULL,
    product_id    INT,
    category      VARCHAR(100),
    search_query  VARCHAR(255),
    city          VARCHAR(100),
    page_url      VARCHAR(500),
    referrer_url  VARCHAR(500),
    PRIMARY KEY (log_id),
    KEY idx_cl_user    (user_id),
    KEY idx_cl_session (session_id),
    KEY idx_cl_time    (event_time),
    KEY idx_cl_action  (action),
    KEY idx_cl_product (product_id),
    CONSTRAINT fk_cl_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
--  VIEW: v_product_views
--  Aggregates total product views
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_product_views AS
SELECT
    cl.product_id,
    p.product_name,
    p.category_id,
    c.category_name,
    COUNT(*)          AS view_count,
    COUNT(DISTINCT cl.user_id) AS unique_viewers
FROM clickstream_logs cl
JOIN products p ON p.product_id = cl.product_id
JOIN categories c ON c.category_id = p.category_id
WHERE cl.action = 'product_view'
GROUP BY cl.product_id, p.product_name, p.category_id, c.category_name;

-- ────────────────────────────────────────────────────────────
--  VIEW: v_conversion_funnel
--  Shows funnel from product_view → add_to_cart → purchase
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_conversion_funnel AS
SELECT
    action,
    COUNT(*)                        AS event_count,
    COUNT(DISTINCT user_id)         AS unique_users,
    COUNT(DISTINCT session_id)      AS unique_sessions
FROM clickstream_logs
GROUP BY action
ORDER BY FIELD(action,
    'login','search','product_view','add_to_cart',
    'wishlist','remove_from_cart','purchase','logout');

-- ────────────────────────────────────────────────────────────
--  VIEW: v_hourly_traffic
--  Peak shopping hours analysis
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_hourly_traffic AS
SELECT
    HOUR(event_time)            AS hour_of_day,
    COUNT(*)                    AS event_count,
    COUNT(DISTINCT user_id)     AS active_users
FROM clickstream_logs
GROUP BY HOUR(event_time)
ORDER BY hour_of_day;

-- ────────────────────────────────────────────────────────────
--  VIEW: v_city_activity
--  Geographic distribution of user activity
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_city_activity AS
SELECT
    city,
    COUNT(*)                AS total_events,
    COUNT(DISTINCT user_id) AS unique_users,
    SUM(CASE WHEN action = 'purchase' THEN 1 ELSE 0 END) AS purchases
FROM clickstream_logs
WHERE city IS NOT NULL
GROUP BY city
ORDER BY total_events DESC;
