/**
 * Deal details page logic (Developer 3)
 * Uses shared API (api.js), Auth (auth.js) and i18n (i18n.js).
 */
const Deals = {
  STEPS: ['negotiating', 'agreed', 'in_transit', 'completed'],
  DEFAULT_LABELS: {
    negotiating: 'Negotiating', agreed: 'Agreed', payment_pending: 'Payment pending',
    paid: 'Paid', in_transit: 'In transit', completed: 'Completed', cancelled: 'Cancelled',
  },
  // Mirrors the server rules (the server is still the authority)
  WHO_CAN_SET: {
    agreed: ['buyer', 'seller'], in_transit: ['seller'],
    completed: ['buyer'], cancelled: ['buyer', 'seller'],
  },
  user: null,
  dealId: null,
  last: null, // last loaded { res, assessment }, used to re-render on language change

  T: (key, fb) => AIAssessment.T(key, fb),
  label(s) { return this.T('deal.status.' + s, this.DEFAULT_LABELS[s] || s); },
  esc: (v) => AIAssessment.esc(v),
  money: (v) => '৳' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  date: (v) => (v ? new Date(v).toLocaleDateString() : '—'),

  showError(msg) {
    const el = document.getElementById('dealError');
    el.textContent = msg;
    el.style.display = 'block';
  },

  // Role badge and page subtitle in the navbar (re-run on language change)
  updateChrome() {
    if (!this.user) return;
    const roleKey = this.user.role;
    document.getElementById('dealRoleBadge').textContent =
      this.T('deal.role.' + roleKey, roleKey.charAt(0).toUpperCase() + roleKey.slice(1));
    document.getElementById('dealSubtext').textContent = this.T('deal.page_title', 'Deal Details');
  },

  async load() {
    try {
      const res = await API.get(`/deals/${this.dealId}`);
      let assessment = res.assessment;
      if (!assessment) {
        try { assessment = await API.get(`/assessment/request/${res.deal.request_id}`); }
        catch (e) { assessment = null; }
      }
      this.last = { res, assessment };
      this.render(res, assessment);
    } catch (err) {
      document.getElementById('dealRoot').innerHTML = '';
      this.showError(err.message);
    }
  },

  renderTimeline(status) {
    if (status === 'cancelled') {
      return `<div class="deal-cancelled">${this.T('deal.cancelled_msg', 'This deal was cancelled.')}</div>`;
    }
    const idx = this.STEPS.indexOf(status);
    const items = this.STEPS.map((s, i) => {
      const cls = idx === -1 ? '' : i < idx ? 'done' : i === idx ? 'current' : '';
      return `<li class="${cls}"><span class="dot"></span>${this.label(s)}</li>`;
    }).join('');
    const extra = idx === -1
      ? `<p class="deal-muted">${this.T('deal.current', 'Current status')}: ${this.esc(this.label(status))}</p>` : '';
    return `<ol class="deal-timeline">${items}</ol>${extra}`;
  },

  renderActions(res) {
    const role = res.your_role;
    const allowed = (res.next_statuses || []).filter(s => (this.WHO_CAN_SET[s] || []).includes(role));
    if (!allowed.length) {
      return `<p class="deal-muted">${this.T('deal.no_actions', 'No actions available for you right now.')}</p>`;
    }
    return allowed.map(s => {
      const danger = s === 'cancelled' ? ' deal-btn-danger' : '';
      const text = this.T('deal.btn.' + s,
        s === 'cancelled' ? 'Cancel deal' : 'Mark as ' + this.DEFAULT_LABELS[s]);
      return `<button class="deal-btn${danger}" data-status="${s}">${this.esc(text)}</button>`;
    }).join(' ');
  },

  render(res, assessment) {
    const d = res.deal;
    const T = (k, f) => this.T(k, f);
    document.getElementById('dealRoot').innerHTML = `
      <div class="deal-grid">
        <section class="deal-card">
          <h2>${T('deal.title', 'Deal')} #${d.id} · ${this.esc(d.product_title)}</h2>
          <p class="deal-status-pill">${this.esc(this.label(d.status))}</p>
          <dl class="deal-dl">
            <dt>${T('deal.buyer', 'Buyer')}</dt><dd>${this.esc(d.buyer_name)}</dd>
            <dt>${T('deal.seller', 'Seller')}</dt><dd>${this.esc(d.seller_name)}</dd>
            <dt>${T('deal.quantity', 'Quantity')}</dt><dd>${Number(d.agreed_quantity)} ${this.esc(d.unit)}</dd>
            <dt>${T('deal.agreed_price', 'Agreed price')}</dt><dd>${this.money(d.agreed_price_per_unit)} / ${this.esc(d.unit)}</dd>
            <dt>${T('deal.original_offer', 'Original offer')}</dt><dd>${this.money(d.original_offer)} / ${this.esc(d.unit)}</dd>
            <dt>${T('deal.total', 'Total')}</dt><dd><strong>${this.money(d.total_amount)}</strong></dd>
            <dt>${T('deal.delivery', 'Delivery')}</dt><dd>${this.esc(d.delivery_location)}</dd>
            <dt>${T('deal.deadline', 'Deadline')}</dt><dd>${this.date(d.delivery_deadline)}</dd>
            <dt>${T('deal.request_made', 'Request made')}</dt><dd>${this.date(d.request_created_at)}</dd>
            <dt>${T('deal.created', 'Deal created')}</dt><dd>${this.date(d.created_at)}</dd>
            <dt>${T('deal.your_role', 'Your role')}</dt><dd>${this.esc(T('deal.role.' + (res.your_role || 'admin'), res.your_role || 'admin'))}</dd>
          </dl>
        </section>

        <section class="deal-card">
          <h3>${T('deal.progress', 'Progress')}</h3>
          ${this.renderTimeline(d.status)}
          <div class="deal-actions">${this.renderActions(res)}</div>
        </section>

        <section class="deal-card deal-wide">${AIAssessment.render(assessment)}</section>
      </div>`;
  },

  async changeStatus(status) {
    const ask = this.T('deal.confirm_cancel', 'Cancel this deal? This cannot be undone.');
    if (status === 'cancelled' && !confirm(ask)) return;
    try {
      await API.put(`/deals/${this.dealId}/status`, { status });
      await this.load();
    } catch (err) {
      this.showError(err.message);
    }
  },
};

document.addEventListener('DOMContentLoaded', async () => {
  Deals.user = await Auth.requireAuth();
  if (!Deals.user) return;

  Deals.updateChrome();
  document.getElementById('dealBack').href =
    Deals.user.role === 'farmer' ? '/pages/seller-dashboard.html' : '/pages/index.html';
  document.getElementById('logoutBtn').addEventListener('click', () => Auth.logout());

  Deals.dealId = new URLSearchParams(window.location.search).get('id');
  if (!Deals.dealId) {
    Deals.showError('No deal selected. Open this page as deal-details.html?id=1');
    return;
  }

  document.getElementById('dealRoot').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-status]');
    if (btn) Deals.changeStatus(btn.dataset.status);
  });

  // Re-render in the new language when the toggle is used
  window.addEventListener('languageChanged', () => {
    Deals.updateChrome();
    if (Deals.last) Deals.render(Deals.last.res, Deals.last.assessment);
  });

  Deals.load();
});


