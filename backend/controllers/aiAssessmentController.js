const db = require('../config/db');
const { assessPrice, convertPrice } = require('../services/aiAssessmentService');

// The ai_assessments.deal_rating column is an enum, so map the readable
// labels used by the API to the values stored in the database (and back).
const RATING_TO_DB = {
  'Fair Market Value': 'Fair',
  'Favorable to Buyer': 'Favorable_Buyer',
  'Favorable to Seller': 'Favorable_Seller',
  'Out of Normal Range': 'Out_Of_Range',
};
const DB_TO_RATING = Object.fromEntries(
  Object.entries(RATING_TO_DB).map(([label, dbValue]) => [dbValue, label])
);

async function findReference(name, region) {
  const [rows] = await db.query(
    `SELECT * FROM price_references
     WHERE LOWER(?) LIKE CONCAT('%', LOWER(commodity_name), '%')
        OR LOWER(commodity_name) LIKE CONCAT('%', LOWER(?), '%')
     ORDER BY commodity_name, id`,
    [name, name]
  );
  if (!rows.length) return null;

  // Same commodity only (first match), then prefer the exact region
  const same = rows.filter(r => r.commodity_name === rows[0].commodity_name);
  const exact = same.find(
    r => r.market_region.toLowerCase() === String(region || '').toLowerCase()
  );
  if (exact) return exact;
  if (same.length === 1) return same[0];

  // No exact region: use the average across regions
  const avg = f => same.reduce((s, r) => s + Number(r[f]), 0) / same.length;
  return {
    ...same[0],
    market_region: 'All regions (average)',
    wholesale_min_price: avg('wholesale_min_price'),
    wholesale_max_price: avg('wholesale_max_price'),
    wholesale_avg_price: avg('wholesale_avg_price'),
  };
}

// Convert the offered price into the reference unit, then assess.
// Returns { error } if the units can't be compared.
function assessWithUnits(price, unit, ref) {
  const converted = convertPrice(Number(price), unit || ref.unit, ref.unit);
  if (converted === null) {
    return { error: `Cannot compare unit "${unit}" with reference unit "${ref.unit}"` };
  }
  return { result: assessPrice(converted, ref) };
}

// POST /api/assessment/evaluate
// body: { commodity_name, market_region?, unit?, offered_price_per_unit }
//   or: { product_id, offered_price_per_unit }
exports.evaluate = async (req, res, next) => {
  try {
    let { commodity_name, market_region, unit, product_id, offered_price_per_unit } = req.body;

    if (product_id) {
      const [p] = await db.query(
        'SELECT title, location, unit FROM products WHERE id = ?', [product_id]);
      if (!p.length) return res.status(404).json({ message: 'Product not found' });
      commodity_name = p[0].title;
      market_region = market_region || p[0].location;
      unit = unit || p[0].unit;
    }
    if (!commodity_name || offered_price_per_unit === undefined) {
      return res.status(400).json({
        message: 'commodity_name (or product_id) and offered_price_per_unit are required',
      });
    }

    const ref = await findReference(commodity_name, market_region);
    if (!ref) {
      return res.status(404).json({ message: `No reference price found for "${commodity_name}"` });
    }

    const { result, error } = assessWithUnits(offered_price_per_unit, unit, ref);
    if (error) return res.status(422).json({ message: error });

    res.json({
      commodity_name: ref.commodity_name,
      market_region: ref.market_region,
      unit: ref.unit,
      ...result,
    });
  } catch (err) {
    if (err.message.includes('Offered price')) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
};

// GET /api/assessment/request/:requestId
exports.getForRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const [reqRows] = await db.query(
      `SELECT pr.*, p.title, p.location, p.unit
       FROM purchase_requests pr JOIN products p ON p.id = pr.product_id
       WHERE pr.id = ?`, [requestId]);
    if (!reqRows.length) return res.status(404).json({ message: 'Purchase request not found' });
    const pr = reqRows[0];

    // Only the buyer, the seller, or an admin may view it
    const uid = req.user.id;
    if (req.user.role !== 'admin' && uid !== pr.buyer_id && uid !== pr.seller_id) {
      return res.status(403).json({ message: 'Not allowed to view this assessment' });
    }

    // Return the saved assessment if it exists
    const [existing] = await db.query(
      'SELECT * FROM ai_assessments WHERE request_id = ? ORDER BY id DESC LIMIT 1', [requestId]);
    if (existing.length) {
      return res.json({ ...existing[0], deal_rating: DB_TO_RATING[existing[0].deal_rating] });
    }

    // Otherwise compute and save it
    const ref = await findReference(pr.title, pr.location);
    if (!ref) {
      return res.status(404).json({ message: `No reference price found for "${pr.title}"` });
    }

    const { result: a, error } = assessWithUnits(pr.offered_price_per_unit, pr.unit, ref);
    if (error) return res.status(422).json({ message: error });

    const [ins] = await db.query(
      `INSERT INTO ai_assessments
       (request_id, market_reference_price, variance_percentage, deal_rating, recommendation_summary)
       VALUES (?, ?, ?, ?, ?)`,
      [requestId, a.market_reference_price, a.variance_percentage,
       RATING_TO_DB[a.deal_rating], a.recommendation_summary]);

    res.status(201).json({ id: ins.insertId, request_id: Number(requestId), ...a });
  } catch (err) { next(err); }
};

// GET /api/assessment/reference-prices?category_id=&region=
exports.getReferencePrices = async (req, res, next) => {
  try {
    const { category_id, region } = req.query;
    const where = [], params = [];
    if (category_id) { where.push('category_id = ?'); params.push(category_id); }
    if (region) { where.push('market_region = ?'); params.push(region); }
    const [rows] = await db.query(
      `SELECT * FROM price_references ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY commodity_name`, params);
    res.json(rows);
  } catch (err) { next(err); }
};

// Exported so dealController can translate stored ratings back to labels
exports.DB_TO_RATING = DB_TO_RATING;