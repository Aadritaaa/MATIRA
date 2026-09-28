const db = require('../config/db');

/**
 * Add a new product (Farmer only)
 * POST /api/seller/products
 */
const createProduct = async (req, res, next) => {
    try {
        const sellerId = req.user.id;
        const {
            title,
            description,
            category_id,
            quantity,
            unit = 'kg',
            price_per_unit,
            min_order_quantity = 1,
            location,
            harvest_date,
            image_url
        } = req.body;

        // Validation
        if (!title || !category_id || !quantity || !price_per_unit || !location) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: title, category_id, quantity, price_per_unit, and location.'
            });
        }

        const numQuantity = parseFloat(quantity);
        const numPrice = parseFloat(price_per_unit);
        const numMinOrder = parseFloat(min_order_quantity) || 1;

        if (isNaN(numQuantity) || numQuantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be a positive number.'
            });
        }

        if (isNaN(numPrice) || numPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Price per unit must be a positive number.'
            });
        }

        // Validate Category exists
        const [categories] = await db.query('SELECT id FROM categories WHERE id = ?', [category_id]);
        if (categories.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category selected.'
            });
        }

        // Insert product
        const [result] = await db.query(
            `INSERT INTO products 
             (seller_id, category_id, title, description, quantity, unit, price_per_unit, min_order_quantity, location, harvest_date, image_url, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`,
            [
                sellerId,
                category_id,
                title.trim(),
                description ? description.trim() : null,
                numQuantity,
                unit,
                numPrice,
                numMinOrder,
                location.trim(),
                harvest_date || null,
                image_url ? image_url.trim() : null
            ]
        );

        const newProductId = result.insertId;

        // Fetch the created product with category name
        const [newProduct] = await db.query(
            `SELECT p.*, c.name AS category_name 
             FROM products p 
             JOIN categories c ON p.category_id = c.id 
             WHERE p.id = ?`,
            [newProductId]
        );

        return res.status(201).json({
            success: true,
            message: 'Product added successfully!',
            product: newProduct[0]
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all products listed by the authenticated farmer
 * GET /api/seller/products
 */
const getMyProducts = async (req, res, next) => {
    try {
        const sellerId = req.user.id;

        const [products] = await db.query(
            `SELECT p.*, c.name AS category_name
             FROM products p
             JOIN categories c ON p.category_id = c.id
             WHERE p.seller_id = ?
             ORDER BY p.created_at DESC`,
            [sellerId]
        );

        return res.status(200).json({
            success: true,
            count: products.length,
            products
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createProduct,
    getMyProducts
};
