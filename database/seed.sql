-- =======================================================
-- MATIRA Initial Seed Data
-- =======================================================

USE matira_db;

-- Update existing category names if present to preserve references
UPDATE categories SET name='Rice & Grains' WHERE id=2;
UPDATE categories SET name='Fruits' WHERE id=3;
UPDATE categories SET name='Lentils & Pulses' WHERE id=5 OR name='Pulses & Lentils';
UPDATE categories SET name='Spices & Herbs' WHERE id=4 OR name='Spices';

-- 1. Insert/Update Expanded Standard Crop & Agricultural Categories
INSERT INTO categories (id, name, description) VALUES
(1, 'Vegetables', 'Fresh seasonal vegetables such as potatoes, tomatoes, onions, brinjal, cauliflower, cabbage, cucumbers, etc.'),
(2, 'Rice & Grains', 'Paddy, rice varieties (Miniket, Nazirshail, Basmati, Chinigura), wheat, maize, corn, barley'),
(3, 'Fruits', 'Fresh regional fruits including mangoes, bananas, jackfruit, guavas, watermelons, papayas, pineapples, litchis'),
(4, 'Spices & Herbs', 'Garlic, ginger, turmeric, dry & green chili, coriander, cumin, bay leaves'),
(5, 'Lentils & Pulses', 'Lentils (Musur), chickpeas (Chola), mung beans (Moog), black gram (Mashkalai), grass pea (Khesari)'),
(6, 'Meat & Livestock', 'Cattle, goats, sheep, native chicken (Deshi Murgi), broilers, ducks for commercial bulk supply'),
(7, 'Fish & Aquaculture', 'Freshwater & coastal fish: Rui, Katla, Hilsa, Pangas, Tilapia, Shrimp/Prawn, Pabda, Koi'),
(8, 'Egg & Dairy Products', 'Raw cow milk, organic ghee, butter, farm chicken eggs, duck eggs'),
(9, 'Oilseeds & Mustard', 'Mustard seeds (Shorisha), sesame (Teel), sunflower seeds, soybeans'),
(10, 'Jute & Natural Fibers', 'Raw Tosha jute, Deshi jute, organic cotton fibers'),
(11, 'Tea, Honey & Organic Agro', 'Premium tea leaves, natural Sundarbans honey, fresh organic mushrooms'),
(12, 'Other Agricultural Products', 'Animal fodder, hay, straw, organic compost, and auxiliary farm goods')
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);

-- 2. Insert Regional Price References (Used for AI Price Advisory)
INSERT INTO price_references (commodity_name, category_id, market_region, wholesale_min_price, wholesale_max_price, wholesale_avg_price, unit) VALUES
('Potato', 1, 'Rajshahi', 30.00, 38.00, 34.00, 'kg'),
('Potato', 1, 'Bogura', 28.00, 36.00, 32.00, 'kg'),
('Potato', 1, 'Dhaka', 34.00, 42.00, 38.00, 'kg'),
('Onion', 4, 'Faridpur', 60.00, 75.00, 68.00, 'kg'),
('Onion', 4, 'Dhaka', 70.00, 85.00, 78.00, 'kg'),
('Tomato', 1, 'Jashore', 40.00, 55.00, 48.00, 'kg'),
('Miniket Rice', 2, 'Dinajpur', 62.00, 70.00, 66.00, 'kg'),
('Miniket Rice', 2, 'Dhaka', 68.00, 76.00, 72.00, 'kg'),
('Garlic', 4, 'Natore', 140.00, 170.00, 155.00, 'kg'),
('Lentil (Musur)', 5, 'Kushtia', 105.00, 120.00, 112.00, 'kg'),
('Broiler Chicken', 6, 'Gazipur', 160.00, 185.00, 172.00, 'kg'),
('Rui Fish', 7, 'Mymensingh', 240.00, 300.00, 270.00, 'kg'),
('Cow Milk', 8, 'Pabna', 55.00, 70.00, 62.00, 'liter'),
('Chicken Eggs', 8, 'Dhaka', 130.00, 148.00, 140.00, 'dozen'),
('Mustard Seed', 9, 'Sirajganj', 85.00, 105.00, 95.00, 'kg'),
('Raw Jute', 10, 'Faridpur', 70.00, 90.00, 80.00, 'kg'),
('Natural Honey', 11, 'Satkhira', 600.00, 850.00, 720.00, 'kg')
ON DUPLICATE KEY UPDATE wholesale_avg_price=VALUES(wholesale_avg_price), category_id=VALUES(category_id);
