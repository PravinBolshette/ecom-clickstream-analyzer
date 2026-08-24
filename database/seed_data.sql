-- ============================================================
--  seed_data.sql
--  Inserts initial reference data into ecommerce_db
-- ============================================================

USE ecommerce_db;

-- ── Categories ──────────────────────────────────────────────
INSERT IGNORE INTO categories (category_name, description) VALUES
('Electronics',    'Laptops, TVs, Cameras and electronic gadgets'),
('Clothing',       'Men, Women and Kids apparel'),
('Books',          'Fiction, Non-fiction, Academic books'),
('Home & Kitchen', 'Cookware, Appliances, Decor'),
('Sports',         'Fitness equipment, Outdoor gear'),
('Beauty',         'Skincare, Haircare, Makeup'),
('Toys',           'Kids toys, Board games, Action figures'),
('Grocery',        'Daily essentials, Fresh produce'),
('Furniture',      'Beds, Sofas, Wardrobes'),
('Mobiles',        'Smartphones, Accessories, Tablets');

-- ── Products (10 per category = 100 products) ───────────────
-- Electronics (category_id = 1)
INSERT IGNORE INTO products (product_name, category_id, brand, price, stock_qty, rating) VALUES
('Samsung 55" 4K Smart TV',          1, 'Samsung',  45999.00, 50,  4.5),
('Sony WH-1000XM5 Headphones',       1, 'Sony',     24990.00, 80,  4.8),
('Dell Inspiron 15 Laptop',          1, 'Dell',     52000.00, 30,  4.3),
('Canon EOS 1500D DSLR Camera',      1, 'Canon',    34500.00, 25,  4.6),
('LG 8kg Washing Machine',           1, 'LG',       28000.00, 40,  4.2),
('boAt Rockerz 450 Bluetooth Headset',1,'boAt',      1499.00,200,  4.1),
('Mi 10000mAh Power Bank',           1, 'Xiaomi',    799.00, 500,  4.4),
('Logitech MX Master 3 Mouse',       1, 'Logitech',  8999.00, 60,  4.7),
('JBL Charge 5 Speaker',             1, 'JBL',      13999.00, 90,  4.6),
('Asus ROG Gaming Laptop',           1, 'Asus',     89999.00, 15,  4.8),
-- Clothing (category_id = 2)
('Levi 501 Original Fit Jeans',      2, 'Levi\'s',   2999.00,200,  4.4),
('Allen Solly Formal Shirt',         2, 'Allen Solly',1499.00,300, 4.2),
('Nike Air Max Running Shoes',       2, 'Nike',      7999.00,150,  4.7),
('H&M Summer Dress',                 2, 'H&M',       1299.00,250,  4.0),
('Puma Dry Cell T-Shirt',            2, 'Puma',       899.00,400,  4.3),
('Raymond Suit Set',                 2, 'Raymond',  12000.00, 80,  4.5),
('Adidas Track Pants',               2, 'Adidas',    2499.00,180,  4.4),
('Wrangler Regular Fit Jeans',       2, 'Wrangler',  2199.00,160,  4.1),
('W Women Kurta Set',                2, 'W',         1899.00,220,  4.3),
('Bata Formal Shoes',                2, 'Bata',      1999.00,200,  4.0),
-- Books (category_id = 3)
('Rich Dad Poor Dad',                3, 'Robert Kiyosaki', 299.00,500,4.7),
('Atomic Habits',                    3, 'James Clear',     399.00,400,4.9),
('The Alchemist',                    3, 'Paulo Coelho',    199.00,600,4.8),
('Wings of Fire',                    3, 'APJ Abdul Kalam', 149.00,800,4.9),
('Data Structures - Cormen',         3, 'MIT Press',       899.00,200,4.6),
('Operating Systems - Galvin',       3, 'Wiley',           750.00,180,4.5),
('Clean Code',                       3, 'Robert Martin',   699.00,250,4.7),
('Harry Potter Set',                 3, 'J K Rowling',    1999.00,300,4.9),
('The Psychology of Money',          3, 'Morgan Housel',   349.00,350,4.8),
('Think and Grow Rich',              3, 'Napoleon Hill',   199.00,450,4.6),
-- Home & Kitchen (category_id = 4)
('Prestige Induction Cooktop',       4, 'Prestige',  2999.00,150,  4.3),
('Philips Air Fryer',                4, 'Philips',   7999.00,100,  4.5),
('Milton Thermosteel Flask',         4, 'Milton',     699.00,500,  4.4),
('Bajaj Mixer Grinder',              4, 'Bajaj',     2299.00,200,  4.2),
('Pigeon Non-stick Cookware Set',    4, 'Pigeon',    1999.00,180,  4.3),
('Bosch Dishwasher 14 Place',        4, 'Bosch',    45000.00, 20,  4.6),
('Kent RO Water Purifier',           4, 'Kent',     13000.00, 60,  4.5),
('Wonderchef Knife Set',             4, 'Wonderchef',1299.00,300,  4.2),
('Cello Opalware Dinner Set',        4, 'Cello',     2499.00,200,  4.1),
('Hafele Kitchen Hood',              4, 'Hafele',   18000.00, 30,  4.4),
-- Sports (category_id = 5)
('Nivia Football Size 5',            5, 'Nivia',      999.00,300,  4.3),
('Cosco Cricket Set',                5, 'Cosco',     2499.00,150,  4.2),
('Boldfit Yoga Mat',                 5, 'Boldfit',    799.00,400,  4.5),
('Spartan Badminton Set',            5, 'Spartan',   1299.00,200,  4.1),
('Decathlon Hiking Backpack',        5, 'Decathlon', 3999.00,100,  4.7),
('Aurion Running Shoes',             5, 'Aurion',    1599.00,250,  4.0),
('Kore 20kg Dumbbell Set',           5, 'Kore',      2999.00,120,  4.4),
('Champion Swim Goggles',            5, 'Champion',   499.00,350,  4.3),
('Wild Craft Trek Poles',            5, 'Wild Craft',1999.00, 80,  4.2),
('Reebok Fitness Band',              5, 'Reebok',    3499.00,160,  4.5);

-- ── Sample Users (10) ────────────────────────────────────────
INSERT IGNORE INTO users
  (username, email, password_hash, full_name, city, state, device, browser)
VALUES
('rahul_sharma',  'rahul@example.com',  SHA2('Pass@1234',256), 'Rahul Sharma',   'Mumbai',    'Maharashtra', 'Desktop','Chrome'),
('priya_patel',   'priya@example.com',  SHA2('Pass@1234',256), 'Priya Patel',    'Ahmedabad', 'Gujarat',     'Mobile', 'Safari'),
('amit_kumar',    'amit@example.com',   SHA2('Pass@1234',256), 'Amit Kumar',     'Delhi',     'Delhi',       'Desktop','Firefox'),
('sneha_reddy',   'sneha@example.com',  SHA2('Pass@1234',256), 'Sneha Reddy',    'Hyderabad', 'Telangana',   'Tablet', 'Chrome'),
('vikram_singh',  'vikram@example.com', SHA2('Pass@1234',256), 'Vikram Singh',   'Jaipur',    'Rajasthan',   'Mobile', 'Chrome'),
('ananya_iyer',   'ananya@example.com', SHA2('Pass@1234',256), 'Ananya Iyer',    'Chennai',   'Tamil Nadu',  'Desktop','Safari'),
('rohit_gupta',   'rohit@example.com',  SHA2('Pass@1234',256), 'Rohit Gupta',    'Lucknow',   'U.P.',        'Mobile', 'Firefox'),
('meera_nair',    'meera@example.com',  SHA2('Pass@1234',256), 'Meera Nair',     'Kochi',     'Kerala',      'Desktop','Chrome'),
('karan_joshi',   'karan@example.com',  SHA2('Pass@1234',256), 'Karan Joshi',    'Pune',      'Maharashtra', 'Mobile', 'Chrome'),
('divya_das',     'divya@example.com',  SHA2('Pass@1234',256), 'Divya Das',      'Kolkata',   'West Bengal', 'Tablet', 'Edge');
