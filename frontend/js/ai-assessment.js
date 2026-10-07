/**
 * AI price advisory card (Developer 3)
 * Advisory only: it never accepts or rejects a deal.
 */
const AIAssessment = {
  META: {
    'Fair Market Value':   { cls: 'fair',   icon: '⚖️' },
    'Favorable to Buyer':  { cls: 'buyer',  icon: '⬇️' },
    'Favorable to Seller': { cls: 'seller', icon: '⬆️' },
    'Out of Normal Range': { cls: 'range',  icon: '⚠️' },
  },

  // Translation helper: uses the shared i18n, falls back to English
  T(key, fallback) {
    return (typeof i18n !== 'undefined' && i18n.t) ? i18n.t(key, fallback) : fallback;
  },

  esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  render(a) {
    const title = this.T('deal.ai.title', 'AI Price Advisory');
    if (!a) {
      return `<div class="ai-card"><h3>${title}</h3>
        <p class="deal-muted">${this.T('deal.ai.none', 'No advisory is available for this request.')}</p></div>`;
    }
    const meta = this.META[a.deal_rating] || { cls: 'range', icon: 'ℹ️' };
    const v = Number(a.variance_percentage);
    const clamped = Math.max(-25, Math.min(25, v));
    const pos = ((clamped + 25) / 50) * 100;
    const sign = v > 0 ? '+' : '';
    const rating = this.T('deal.rating.' + a.deal_rating, a.deal_rating);

    return `
      <div class="ai-card">
        <h3>${title}</h3>
        <span class="ai-badge ai-${meta.cls}">${meta.icon} ${this.esc(rating)}</span>
        <div class="ai-stats">
          <div><span class="deal-muted">${this.T('deal.ai.market', 'Market average')}</span><strong>৳${Number(a.market_reference_price).toFixed(2)}</strong></div>
          <div><span class="deal-muted">${this.T('deal.ai.variance', 'Variance')}</span><strong>${sign}${v.toFixed(2)}%</strong></div>
        </div>
        <div class="ai-gauge"><div class="ai-band"></div><div class="ai-marker" style="left:${pos}%"></div></div>
        <div class="ai-scale"><span>-25%</span><span>${this.T('deal.ai.fair', 'Fair (±10%)')}</span><span>+25%</span></div>
        <p class="ai-summary">${this.esc(a.recommendation_summary)}</p>
        <p class="deal-muted">${this.T('deal.ai.note', 'Advisory only. The final decision stays with the buyer and seller.')}</p>
      </div>`;
  },
};

