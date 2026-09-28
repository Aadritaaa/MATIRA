-- =======================================================
-- MATIRA Initial Seed Data
-- =======================================================

USE matira_db;

-- 1. Insert Standard Crop Categories
INSERT INTO categories (id, name, description) VALUES
(1, 'Vegetables', 'Fresh seasonal vegetables such as potatoes, tomatoes, onions, brinjal, etc.'),
(2, 'Grains & Cereals', 'Paddy, rice (Miniket, Nazirshail), wheat, maize, corn'),
(3, 'Fruits', 'Mangoes, bananas, jackfruit, guavas, watermelons, papayas'),
(4, 'Spices', 'Garlic, ginger, turmeric, chili, coriander'),
(5, 'Pulses & Lentils', 'Lentils (Musur), chickpeas (Chola), mung beans, mashkalai')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2. Insert Regional Price References (Used for AI Price Advisory)
INSERT INTO price_references (commodity_name, category_id, market_region, wholesale_min_price, wholesale_max_price, wholesale_avg_price, unit) VALUES
('Potato', 1, 'Rajshahi', 30.00, 38.00, 34.00, 'kg'),
('Potato', 1, 'Bogura', 28.00, 36.00, 32.00, 'kg'),
('Potato', 1, 'Dhaka', 34.00, 42.00, 38.00, 'kg'),
('Onion', 4, 'Faridpur', 60.00, 75.00, 68.00, 'kg'),
('Onion', 4, 'Dhaka', 70.00, 85.00, 78.00, 'kg'),
('Tomato', 1, 'Jessore', 40.00, 55.00, 48.00, 'kg'),
('Miniket Rice', 2, 'Dinajpur', 62.00, 70.00, 66.00, 'kg'),
('Miniket Rice', 2, 'Dhaka', 68.00, 76.00, 72.00, 'kg'),
('Garlic', 4, 'Natore', 140.00, 170.00, 155.00, 'kg'),
('Lentil (Musur)', 5, 'Kushtia', 105.00, 120.00, 112.00, 'kg')
ON DUPLICATE KEY UPDATE wholesale_avg_price=VALUES(wholesale_avg_price);
