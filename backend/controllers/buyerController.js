const db = require('../config/db');

const PRODUCT_SELECT = `
  SELECT p.id, p.title, p.description, p.quantity, p.unit, p.price_per_unit,
         p.min_order_quantity, p.min_order_unit, p.location, p.harvest_date,
         p.created_at, c.name AS category, u.full_name AS seller_name
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN users u ON u.id = p.seller_id`;

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
    const where = ["p.status = 'available'", 'p.quantity > 0'];
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
      `${PRODUCT_SELECT} WHERE ${where.join(' AND ')} ORDER BY ${orderBy}`, params);
    res.json({ success: true, products: rows });
  } catch (err) { next(err); }
};

// GET /api/marketplace/products/:id
exports.getProduct = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `${PRODUCT_SELECT} WHERE p.id = ? AND p.status = 'available'`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product: rows[0] });
  } catch (err) { next(err); }
};

// POST /api/buyer/requests  (buyer only)
exports.createRequest = async (req, res, next) => {
  try {
    const { product_id, requested_quantity, offered_price_per_unit,
            delivery_location, delivery_deadline, notes } = req.body;
    const qty = Number(requested_quantity);

    if (!product_id || !qty || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Product and a valid quantity are required' });
    }
    if (!delivery_location || !delivery_location.trim()) {
      return res.status(400).json({ success: false, message: 'Delivery location is required' });
    }

    const [rows] = await db.query(
      "SELECT id, seller_id, quantity, min_order_quantity, price_per_unit FROM products WHERE id = ? AND status = 'available'",
      [product_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Product not found' });

    const p = rows[0];
    if (qty < Number(p.min_order_quantity)) {
      return res.status(400).json({ success: false, message: `Minimum order is ${p.min_order_quantity}` });
    }
    if (qty > Number(p.quantity)) {
      return res.status(400).json({ success: false, message: `Only ${p.quantity} available` });
    }

    const price = Number(offered_price_per_unit) > 0 ? Number(offered_price_per_unit) : Number(p.price_per_unit);
    const total = Math.round(qty * price * 100) / 100;

    const [result] = await db.query(
      `INSERT INTO purchase_requests
         (product_id, buyer_id, seller_id, requested_quantity, offered_price_per_unit,
          total_price, delivery_location, delivery_deadline, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [p.id, req.user.id, p.seller_id, qty, price, total,
       delivery_location.trim(), delivery_deadline || null, notes || null]);

    res.status(201).json({ success: true, message: 'Purchase request sent', request_id: result.insertId });
  } catch (err) { next(err); }
};

// GET /api/buyer/requests  (buyer only)
exports.myRequests = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT r.id, r.requested_quantity, r.offered_price_per_unit, r.total_price,
              r.delivery_location, r.delivery_deadline, r.notes, r.status, r.created_at,
              p.id AS product_id, p.title, p.unit, u.full_name AS seller_name
         FROM purchase_requests r
         JOIN products p ON p.id = r.product_id
         JOIN users u ON u.id = r.seller_id
        WHERE r.buyer_id = ?
        ORDER BY r.created_at DESC`, [req.user.id]);
    res.json({ success: true, requests: rows });
  } catch (err) { next(err); }
};

// POST /api/buyer/requests/:id/withdraw  (buyer only, pending only)
exports.withdrawRequest = async (req, res, next) => {
  try {
    const [result] = await db.query(
      "DELETE FROM purchase_requests WHERE id = ? AND buyer_id = ? AND status = 'pending'",
      [req.params.id, req.user.id]);
    if (!result.affectedRows) {
      return res.status(400).json({ success: false, message: 'Request not found or already being processed' });
    }
    res.json({ success: true, message: 'Request withdrawn' });
  } catch (err) { next(err); }
};