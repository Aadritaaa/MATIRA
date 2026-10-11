const db = require('../config/db');

// GET /api/marketplace/categories
exports.listCategories = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT id, name FROM categories ORDER BY name');
    res.json({ success: true, categories: rows });
  } catch (err) { next(err); }
};

// GET /api/marketplace/products?search=&category=&location=&minPrice=&maxPrice=&sort=
exports.listProducts = async (req, res, next) => {
  try {
    const { search, category, location, minPrice, maxPrice, sort } = req.query;
    const where = ["p.status = 'active'", 'p.quantity > 0'];
    const params = [];

    if (search)   { where.push('(p.title LIKE ? OR p.description LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    if (category) { where.push('p.category_id = ?'); params.push(category); }
    if (location) { where.push('p.location LIKE ?'); params.push(`%${location}%`); }
    if (minPrice) { where.push('p.price_per_unit >= ?'); params.push(Number(minPrice)); }
    if (maxPrice) { where.push('p.price_per_unit <= ?'); params.push(Number(maxPrice)); }

    const orderBy = {
      price_asc: 'p.price_per_unit ASC',
      price_desc: 'p.price_per_unit DESC',
      newest: 'p.created_at DESC'
    }[sort] || 'p.created_at DESC';

    const [rows] = await db.query(
      `SELECT p.id, p.title, p.description, p.quantity, p.unit, p.price_per_unit,
              p.min_order_quantity, p.location, p.created_at,
              c.name AS category, u.name AS seller_name
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         JOIN users u ON u.id = p.seller_id
        WHERE ${where.join(' AND ')}
        ORDER BY ${orderBy}`,
      params
    );
    res.json({ success: true, products: rows });
  } catch (err) { next(err); }
};

// GET /api/marketplace/products/:id
exports.getProduct = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT p.id, p.title, p.description, p.quantity, p.unit, p.price_per_unit,
              p.min_order_quantity, p.location, p.created_at,
              c.name AS category, u.name AS seller_name
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         JOIN users u ON u.id = p.seller_id
        WHERE p.id = ? AND p.status = 'active'`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product: rows[0] });
  } catch (err) { next(err); }
};

// POST /api/buyer/requests   (buyer only)
exports.createRequest = async (req, res, next) => {
  try {
    const { product_id, quantity, offered_price, message } = req.body;
    const qty = Number(quantity);

    if (!product_id || !qty || qty <= 0) {
      return res.status(400).json({ success: false, message: 'product_id and a valid quantity are required' });
    }

    const [rows] = await db.query(
      "SELECT id, seller_id, quantity, min_order_quantity, price_per_unit FROM products WHERE id = ? AND status = 'active'",
      [product_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Product not found' });

    const p = rows[0];
    if (qty < Number(p.min_order_quantity)) {
      return res.status(400).json({ success: false, message: `Minimum order is ${p.min_order_quantity}` });
    }
    if (qty > Number(p.quantity)) {
      return res.status(400).json({ success: false, message: `Only ${p.quantity} available` });
    }

    const price = offered_price ? Number(offered_price) : p.price_per_unit;

    const [result] = await db.query(
      `INSERT INTO purchase_requests (product_id, buyer_id, seller_id, quantity, offered_price, message, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [p.id, req.user.id, p.seller_id, qty, price, message || null]
    );
    res.status(201).json({ success: true, message: 'Purchase request sent', request_id: result.insertId });
  } catch (err) { next(err); }
};

// GET /api/buyer/requests   (buyer only)
exports.myRequests = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT r.id, r.quantity, r.offered_price, r.message, r.status, r.created_at,
              p.id AS product_id, p.title, p.unit, u.name AS seller_name
         FROM purchase_requests r
         JOIN products p ON p.id = r.product_id
         JOIN users u ON u.id = r.seller_id
        WHERE r.buyer_id = ?
        ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, requests: rows });
  } catch (err) { next(err); }
};

// PATCH /api/buyer/requests/:id/cancel   (buyer only, pending requests only)
exports.cancelRequest = async (req, res, next) => {
  try {
    const [result] = await db.query(
      "UPDATE purchase_requests SET status = 'cancelled' WHERE id = ? AND buyer_id = ? AND status = 'pending'",
      [req.params.id, req.user.id]
    );
    if (!result.affectedRows) {
      return res.status(400).json({ success: false, message: 'Request not found or cannot be cancelled' });
    }
    res.json({ success: true, message: 'Request cancelled' });
  } catch (err) { next(err); }
};