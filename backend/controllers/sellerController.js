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
            min_order_unit,
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
        const cleanUnit = (unit || 'kg').trim();
        const cleanMinOrderUnit = (min_order_unit || cleanUnit || 'kg').trim();

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

        if (isNaN(numMinOrder) || numMinOrder <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Minimum order quantity must be a positive number.'
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
             (seller_id, category_id, title, description, quantity, unit, price_per_unit, min_order_quantity, min_order_unit, location, harvest_date, image_url, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`,
            [
                sellerId,
                category_id,
                title.trim(),
                description ? description.trim() : null,
                numQuantity,
                cleanUnit,
                numPrice,
                numMinOrder,
                cleanMinOrderUnit,
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
        const { status, category_id, search } = req.query;

        let query = `
            SELECT p.*, c.name AS category_name
            FROM products p
            JOIN categories c ON p.category_id = c.id
            WHERE p.seller_id = ?
        `;
        const params = [sellerId];

        if (status) {
            query += ' AND p.status = ?';
            params.push(status);
        }

        if (category_id) {
            query += ' AND p.category_id = ?';
            params.push(category_id);
        }

        if (search) {
            query += ' AND (p.title LIKE ? OR p.location LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY p.created_at DESC';

        const [products] = await db.query(query, params);

        return res.status(200).json({
            success: true,
            count: products.length,
            products
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get single product details for seller
 * GET /api/seller/products/:id
 */
const getProductById = async (req, res, next) => {
    try {
        const sellerId = req.user.id;
        const productId = req.params.id;

        const [products] = await db.query(
            `SELECT p.*, c.name AS category_name
             FROM products p
             JOIN categories c ON p.category_id = c.id
             WHERE p.id = ? AND p.seller_id = ?`,
            [productId, sellerId]
        );

        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found or you do not have permission to view it.'
            });
        }

        return res.status(200).json({
            success: true,
            product: products[0]
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update an existing product
 * PUT /api/seller/products/:id
 */
const updateProduct = async (req, res, next) => {
    try {
        const sellerId = req.user.id;
        const productId = req.params.id;
        const {
            title,
            description,
            category_id,
            quantity,
            unit,
            price_per_unit,
            min_order_quantity,
            min_order_unit,
            location,
            harvest_date,
            status,
            image_url
        } = req.body;

        // Check ownership
        const [existing] = await db.query(
            'SELECT id FROM products WHERE id = ? AND seller_id = ?',
            [productId, sellerId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found or you do not have permission to update it.'
            });
        }

        // Validate values if provided
        if (category_id) {
            const [cat] = await db.query('SELECT id FROM categories WHERE id = ?', [category_id]);
            if (cat.length === 0) {
                return res.status(400).json({ success: false, message: 'Invalid category selected.' });
            }
        }

        if (quantity !== undefined && (isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0)) {
            return res.status(400).json({ success: false, message: 'Quantity must be a positive number.' });
        }

        if (price_per_unit !== undefined && (isNaN(parseFloat(price_per_unit)) || parseFloat(price_per_unit) <= 0)) {
            return res.status(400).json({ success: false, message: 'Price per unit must be a positive number.' });
        }

        if (min_order_quantity !== undefined && (isNaN(parseFloat(min_order_quantity)) || parseFloat(min_order_quantity) <= 0)) {
            return res.status(400).json({ success: false, message: 'Minimum order quantity must be a positive number.' });
        }

        await db.query(
            `UPDATE products
             SET title = COALESCE(?, title),
                 description = COALESCE(?, description),
                 category_id = COALESCE(?, category_id),
                 quantity = COALESCE(?, quantity),
                 unit = COALESCE(?, unit),
                 price_per_unit = COALESCE(?, price_per_unit),
                 min_order_quantity = COALESCE(?, min_order_quantity),
                 min_order_unit = COALESCE(?, min_order_unit),
                 location = COALESCE(?, location),
                 harvest_date = COALESCE(?, harvest_date),
                 status = COALESCE(?, status),
                 image_url = COALESCE(?, image_url)
             WHERE id = ? AND seller_id = ?`,
            [
                title ? title.trim() : null,
                description !== undefined ? description : null,
                category_id || null,
                quantity !== undefined ? parseFloat(quantity) : null,
                unit ? unit.trim() : null,
                price_per_unit !== undefined ? parseFloat(price_per_unit) : null,
                min_order_quantity !== undefined ? parseFloat(min_order_quantity) : null,
                min_order_unit ? min_order_unit.trim() : null,
                location ? location.trim() : null,
                harvest_date || null,
                status || null,
                image_url || null,
                productId,
                sellerId
            ]
        );

        const [updatedProduct] = await db.query(
            `SELECT p.*, c.name AS category_name
             FROM products p
             JOIN categories c ON p.category_id = c.id
             WHERE p.id = ?`,
            [productId]
        );

        return res.status(200).json({
            success: true,
            message: 'Product updated successfully!',
            product: updatedProduct[0]
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a product
 * DELETE /api/seller/products/:id
 */
const deleteProduct = async (req, res, next) => {
    try {
        const sellerId = req.user.id;
        const productId = req.params.id;

        const [existing] = await db.query(
            'SELECT id, title FROM products WHERE id = ? AND seller_id = ?',
            [productId, sellerId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found or you do not have permission to delete it.'
            });
        }

        // Delete product (CASCADE will clean up related requests if schema allows, or set inactive)
        await db.query('DELETE FROM products WHERE id = ? AND seller_id = ?', [productId, sellerId]);

        return res.status(200).json({
            success: true,
            message: `Product "${existing[0].title}" deleted successfully.`
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all incoming purchase requests received by the seller
 * GET /api/seller/requests
 */
const getIncomingRequests = async (req, res, next) => {
    try {
        const sellerId = req.user.id;

        const [requests] = await db.query(
            `SELECT 
                pr.id,
                pr.product_id,
                pr.buyer_id,
                pr.seller_id,
                pr.requested_quantity,
                pr.offered_price_per_unit,
                pr.total_price,
                pr.delivery_location,
                pr.delivery_deadline,
                pr.notes,
                pr.status,
                pr.created_at,
                p.title AS product_title,
                p.unit AS product_unit,
                p.price_per_unit AS product_asking_price,
                p.quantity AS product_available_quantity,
                u.full_name AS buyer_name,
                u.phone AS buyer_phone,
                u.email AS buyer_email,
                u.district AS buyer_district
             FROM purchase_requests pr
             JOIN products p ON pr.product_id = p.id
             JOIN users u ON pr.buyer_id = u.id
             WHERE pr.seller_id = ?
             ORDER BY pr.created_at DESC`,
            [sellerId]
        );

        return res.status(200).json({
            success: true,
            count: requests.length,
            requests
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update status of an incoming purchase request (Accept / Reject / Review)
 * PUT /api/seller/requests/:id/status
 */
const updateRequestStatus = async (req, res, next) => {
    try {
        const sellerId = req.user.id;
        const requestId = req.params.id;
        const { status } = req.body;

        const validStatuses = ['pending', 'under_review', 'accepted', 'rejected', 'countered'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: [${validStatuses.join(', ')}]`
            });
        }

        // Fetch request and verify seller ownership
        const [requests] = await db.query(
            `SELECT pr.*, p.quantity AS current_stock, p.title AS product_title 
             FROM purchase_requests pr
             JOIN products p ON pr.product_id = p.id
             WHERE pr.id = ? AND pr.seller_id = ?`,
            [requestId, sellerId]
        );

        if (requests.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Purchase request not found or you do not have permission to manage it.'
            });
        }

        const request = requests[0];

        // Update purchase request status
        await db.query(
            'UPDATE purchase_requests SET status = ? WHERE id = ?',
            [status, requestId]
        );

        // If accepted, create or update a deal record for seamless workflow
        if (status === 'accepted') {
            const [existingDeal] = await db.query(
                'SELECT id FROM deals WHERE request_id = ?',
                [requestId]
            );

            if (existingDeal.length === 0) {
                await db.query(
                    `INSERT INTO deals 
                     (request_id, product_id, buyer_id, seller_id, agreed_quantity, agreed_price_per_unit, total_amount, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'agreed')`,
                    [
                        requestId,
                        request.product_id,
                        request.buyer_id,
                        sellerId,
                        request.requested_quantity,
                        request.offered_price_per_unit,
                        request.total_price
                    ]
                );
            }
        }

        return res.status(200).json({
            success: true,
            message: `Purchase request marked as "${status}".`,
            request_id: requestId,
            status
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get seller sales and transaction history
 * GET /api/seller/history
 */
const getSellerHistory = async (req, res, next) => {
    try {
        const sellerId = req.user.id;

        const [history] = await db.query(
            `SELECT 
                d.id AS deal_id,
                d.request_id,
                d.agreed_quantity,
                d.agreed_price_per_unit,
                d.total_amount,
                d.status AS deal_status,
                d.created_at AS deal_date,
                p.title AS product_title,
                p.unit AS product_unit,
                u.full_name AS buyer_name,
                u.phone AS buyer_phone,
                u.district AS buyer_district,
                t.id AS transaction_id,
                t.payment_method,
                t.payment_status,
                t.amount AS payment_amount
             FROM deals d
             JOIN products p ON d.product_id = p.id
             JOIN users u ON d.buyer_id = u.id
             LEFT JOIN transactions t ON t.deal_id = d.id
             WHERE d.seller_id = ?
             ORDER BY d.created_at DESC`,
            [sellerId]
        );

        return res.status(200).json({
            success: true,
            count: history.length,
            history
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get seller dashboard summary metrics
 * GET /api/seller/metrics
 */
const getSellerMetrics = async (req, res, next) => {
    try {
        const sellerId = req.user.id;

        const [[productStats]] = await db.query(
            `SELECT 
                COUNT(*) AS total_products,
                SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS active_products
             FROM products WHERE seller_id = ?`,
            [sellerId]
        );

        const [[requestStats]] = await db.query(
            `SELECT 
                COUNT(*) AS total_requests,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_requests
             FROM purchase_requests WHERE seller_id = ?`,
            [sellerId]
        );

        const [[dealStats]] = await db.query(
            `SELECT 
                COUNT(*) AS total_deals,
                COALESCE(SUM(total_amount), 0) AS total_sales_volume
             FROM deals WHERE seller_id = ? AND status IN ('agreed', 'paid', 'in_transit', 'completed')`,
            [sellerId]
        );

        return res.status(200).json({
            success: true,
            metrics: {
                total_products: parseInt(productStats.total_products || 0, 10),
                active_products: parseInt(productStats.active_products || 0, 10),
                total_requests: parseInt(requestStats.total_requests || 0, 10),
                pending_requests: parseInt(requestStats.pending_requests || 0, 10),
                total_deals: parseInt(dealStats.total_deals || 0, 10),
                total_sales_volume: parseFloat(dealStats.total_sales_volume || 0)
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createProduct,
    getMyProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getIncomingRequests,
    updateRequestStatus,
    getSellerHistory,
    getSellerMetrics
};
