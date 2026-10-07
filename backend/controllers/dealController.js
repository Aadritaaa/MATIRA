const db = require('../config/db');
const { DB_TO_RATING } = require('./aiAssessmentController');

// From-status -> allowed next statuses
const TRANSITIONS = {
  negotiating: ['agreed', 'cancelled'],
  agreed: ['in_transit', 'cancelled'],
  in_transit: ['completed'],
  completed: [],
  cancelled: [],
};
// Who (role in the deal) may set each target status
const WHO_CAN_SET = {
  agreed: ['buyer', 'seller'],
  in_transit: ['seller'],   // seller ships
  completed: ['buyer'],     // buyer confirms receipt
  cancelled: ['buyer', 'seller'],
};

const roleInDeal = (user, deal) =>
  user.id === deal.seller_id ? 'seller' : user.id === deal.buyer_id ? 'buyer' : null;

// POST /api/deals   body: { request_id, agreed_quantity?, agreed_price_per_unit? }
exports.createDeal = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const { request_id } = req.body;
    if (!request_id) {
      return res.status(400).json({ success: false, message: 'request_id is required' });
    }

    await conn.beginTransaction();
    const [rows] = await conn.query(
      'SELECT * FROM purchase_requests WHERE id = ? FOR UPDATE', [request_id]);
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Purchase request not found' });
    }
    const pr = rows[0];

    // Only the seller of the request (or an admin) converts it
    if (req.user.role !== 'admin' && req.user.id !== pr.seller_id) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'Only the seller of this request can create a deal' });
    }
    if (pr.status !== 'accepted') {
      await conn.rollback();
      return res.status(409).json({ success: false, message: `Request must be "accepted" (current: ${pr.status})` });
    }

    const qty = Number(req.body.agreed_quantity ?? pr.requested_quantity);
    const price = Number(req.body.agreed_price_per_unit ?? pr.offered_price_per_unit);
    if (!(qty > 0) || !(price > 0)) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Quantity and price must be positive numbers' });
    }

    const [ins] = await conn.query(
      `INSERT INTO deals (request_id, product_id, buyer_id, seller_id,
                          agreed_quantity, agreed_price_per_unit, total_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [pr.id, pr.product_id, pr.buyer_id, pr.seller_id, qty, price, +(qty * price).toFixed(2)]);

    await conn.query("UPDATE purchase_requests SET status = 'converted' WHERE id = ?", [pr.id]);
    await conn.query('UPDATE ai_assessments SET deal_id = ? WHERE request_id = ?', [ins.insertId, pr.id]);
    await conn.commit();

    res.status(201).json({ success: true, message: 'Deal created', deal_id: ins.insertId });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'A deal already exists for this request' });
    }
    next(err);
  } finally {
    conn.release();
  }
};

// GET /api/deals
exports.listDeals = async (req, res, next) => {
  try {
    const admin = req.user.role === 'admin';
    const [rows] = await db.query(
      `SELECT d.*, p.title AS product_title, p.unit,
              b.full_name AS buyer_name, s.full_name AS seller_name
       FROM deals d
       JOIN products p ON p.id = d.product_id
       JOIN users b ON b.id = d.buyer_id
       JOIN users s ON s.id = d.seller_id
       ${admin ? '' : 'WHERE d.buyer_id = ? OR d.seller_id = ?'}
       ORDER BY d.created_at DESC`,
      admin ? [] : [req.user.id, req.user.id]);
    res.json({ success: true, deals: rows });
  } catch (err) { next(err); }
};

// GET /api/deals/:id
exports.getDeal = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*, p.title AS product_title, p.unit, p.location,
              b.full_name AS buyer_name, s.full_name AS seller_name,
              pr.offered_price_per_unit AS original_offer,
              pr.delivery_location, pr.delivery_deadline,
              pr.created_at AS request_created_at
       FROM deals d
       JOIN products p ON p.id = d.product_id
       JOIN users b ON b.id = d.buyer_id
       JOIN users s ON s.id = d.seller_id
       JOIN purchase_requests pr ON pr.id = d.request_id
       WHERE d.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Deal not found' });
    const deal = rows[0];

    if (req.user.role !== 'admin' && !roleInDeal(req.user, deal)) {
      return res.status(403).json({ success: false, message: 'Not allowed to view this deal' });
    }

    const [a] = await db.query(
      'SELECT * FROM ai_assessments WHERE request_id = ? ORDER BY id DESC LIMIT 1', [deal.request_id]);
    const assessment = a.length ? { ...a[0], deal_rating: DB_TO_RATING[a[0].deal_rating] } : null;

    res.json({
      success: true,
      deal,
      your_role: roleInDeal(req.user, deal),
      next_statuses: TRANSITIONS[deal.status] || [],
      assessment,
    });
  } catch (err) { next(err); }
};

// PUT /api/deals/:id/status   body: { status }
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const [rows] = await db.query('SELECT * FROM deals WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Deal not found' });
    const deal = rows[0];

    const role = roleInDeal(req.user, deal);
    if (!role) return res.status(403).json({ success: false, message: 'You are not part of this deal' });

    if (!TRANSITIONS[deal.status]?.includes(status)) {
      return res.status(409).json({
        success: false,
        message: `Cannot move from "${deal.status}" to "${status}". Allowed: ${(TRANSITIONS[deal.status] || []).join(', ') || 'none'}`,
      });
    }
    if (!WHO_CAN_SET[status].includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Only the ${WHO_CAN_SET[status].join(' or ')} can set "${status}"`,
      });
    }

    await db.query('UPDATE deals SET status = ? WHERE id = ?', [status, deal.id]);
    res.json({ success: true, message: `Deal is now ${status}`, status });
  } catch (err) { next(err); }
};