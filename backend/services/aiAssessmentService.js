// Rule-based, reference-price advisory. Never accepts or rejects deals.

const FAIR_BAND_PERCENT = 10;

const UNITS = {
  mass:   { g: 0.001, gram: 0.001, kg: 1, quintal: 100, maund: 40, ton: 1000, tonne: 1000 },
  volume: { ml: 0.001, l: 1, liter: 1, litre: 1 },
  count:  { piece: 1, pc: 1, pcs: 1, dozen: 12 },
};

function findUnit(u) {
  const key = String(u || '').trim().toLowerCase();
  for (const [group, table] of Object.entries(UNITS)) {
    if (key in table) return { group, factor: table[key] };
  }
  return null;
}

// Price per `fromUnit` -> price per `toUnit`. Returns null if not comparable.
function convertPrice(price, fromUnit, toUnit) {
  const from = findUnit(fromUnit), to = findUnit(toUnit);
  if (!from || !to || from.group !== to.group) return null;
  return price * (to.factor / from.factor);
}

function calculateVariance(offeredPrice, marketAvg) {
  if (!marketAvg || marketAvg <= 0) return null;
  return ((offeredPrice - marketAvg) / marketAvg) * 100;
}

function rateOffer(offeredPrice, variancePct, ref) {
  const min = Number(ref.wholesale_min_price);
  const max = Number(ref.wholesale_max_price);
  if (offeredPrice < min || offeredPrice > max) return 'Out of Normal Range';
  if (variancePct < -FAIR_BAND_PERCENT) return 'Favorable to Buyer';
  if (variancePct > FAIR_BAND_PERCENT) return 'Favorable to Seller';
  return 'Fair Market Value';
}

function buildSummary(rating, variancePct, offeredPrice, ref) {
  const avg = Number(ref.wholesale_avg_price);
  const v = Math.abs(variancePct).toFixed(1);
  const unit = ref.unit;
  switch (rating) {
    case 'Fair Market Value':
      return `The offered price (${offeredPrice.toFixed(2)}/${unit}) is within 10% of the market average (${avg}/${unit}). This looks like a fair deal for both sides.`;
    case 'Favorable to Buyer':
      return `The offered price is ${v}% below the market average (${avg}/${unit}). Sellers may want to counter; buyers are getting a good price.`;
    case 'Favorable to Seller':
      return `The offered price is ${v}% above the market average (${avg}/${unit}). Buyers may want to negotiate; sellers are getting a strong price.`;
    default:
      return `The offered price (${offeredPrice.toFixed(2)}/${unit}) is outside the normal wholesale range (${ref.wholesale_min_price}-${ref.wholesale_max_price}/${unit}). Please double-check the price before proceeding.`;
  }
}

function assessPrice(offeredPrice, ref) {
  const offered = Number(offeredPrice);
  if (!Number.isFinite(offered) || offered <= 0) {
    throw new Error('Offered price must be a positive number');
  }
  const marketAvg = Number(ref.wholesale_avg_price);
  const variancePct = calculateVariance(offered, marketAvg);
  if (variancePct === null) throw new Error('Invalid market reference price');

  const rating = rateOffer(offered, variancePct, ref);
  return {
    market_reference_price: marketAvg,
    variance_percentage: Number(variancePct.toFixed(2)),
    deal_rating: rating,
    recommendation_summary: buildSummary(rating, variancePct, offered, ref),
  };
}

module.exports = { calculateVariance, rateOffer, assessPrice, convertPrice };
