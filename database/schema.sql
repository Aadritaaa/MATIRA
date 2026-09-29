-- =======================================================
-- MATIRA Database Schema
-- A Direct B2B Agricultural Marketplace
-- =======================================================

CREATE DATABASE IF NOT EXISTS matira_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE matira_db;

-- 1. Users Table (Farmers, Buyers, Admins)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('farmer', 'buyer', 'admin') NOT NULL DEFAULT 'farmer',
    district VARCHAR(100) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Products Table (Created by Farmers / Sellers)
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    category_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'kg',
    price_per_unit DECIMAL(10, 2) NOT NULL,
    min_order_quantity DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    min_order_unit VARCHAR(20) NOT NULL DEFAULT 'kg',
    location VARCHAR(100) NOT NULL,
    harvest_date DATE,
    image_url VARCHAR(255),
    status ENUM('available', 'sold_out', 'inactive') NOT NULL DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 4. Purchase Requests Table (Created by Buyers)
CREATE TABLE IF NOT EXISTS purchase_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    requested_quantity DECIMAL(10, 2) NOT NULL,
    offered_price_per_unit DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    delivery_location VARCHAR(255) NOT NULL,
    delivery_deadline DATE,
    notes TEXT,
    status ENUM('pending', 'under_review', 'accepted', 'rejected', 'countered', 'converted') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Deals Table (Converted from accepted Purchase Requests)
CREATE TABLE IF NOT EXISTS deals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL UNIQUE,
    product_id INT NOT NULL,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    agreed_quantity DECIMAL(10, 2) NOT NULL,
    agreed_price_per_unit DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    status ENUM('negotiating', 'agreed', 'payment_pending', 'paid', 'in_transit', 'completed', 'cancelled') NOT NULL DEFAULT 'negotiating',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Reference Prices Table (For AI-Assisted Assessment)
CREATE TABLE IF NOT EXISTS price_references (
    id INT AUTO_INCREMENT PRIMARY KEY,
    commodity_name VARCHAR(100) NOT NULL,
    category_id INT NOT NULL,
    market_region VARCHAR(100) NOT NULL,
    wholesale_min_price DECIMAL(10, 2) NOT NULL,
    wholesale_max_price DECIMAL(10, 2) NOT NULL,
    wholesale_avg_price DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'kg',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 7. AI Assessments Table
CREATE TABLE IF NOT EXISTS ai_assessments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    deal_id INT,
    market_reference_price DECIMAL(10, 2) NOT NULL,
    variance_percentage DECIMAL(6, 2) NOT NULL,
    deal_rating ENUM('Fair', 'Favorable_Buyer', 'Favorable_Seller', 'Out_Of_Range') NOT NULL,
    recommendation_summary TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 8. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NOT NULL,
    payer_id INT NOT NULL,
    payee_id INT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method ENUM('mfs_bkash', 'mfs_nagad', 'bank_transfer', 'cash_on_delivery', 'escrow') NOT NULL,
    payment_status ENUM('pending', 'escrow_held', 'released', 'refunded', 'failed') NOT NULL DEFAULT 'pending',
    transaction_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
    FOREIGN KEY (payer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (payee_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
