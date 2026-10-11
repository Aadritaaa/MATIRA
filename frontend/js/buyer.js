// Assumes api.js exposes api.get(path), api.post(path, body) and throws on non-2xx.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const showMsg = (el, text, ok) => {
  el.textContent = text;
  el.className = 'mp-msg ' + (ok ? 'ok' : 'err');
};

function buyerLogout() {
  if (window.Auth && typeof Auth.logout === 'function') return Auth.logout();
  localStorage.removeItem('token');
  location.href = 'login.html';
}

/* ================= marketplace.html ================= */
async function initMarketplace() {
  const grid = document.getElementById('productGrid');
  const catSel = document.getElementById('category');

  try {
    const cats = await api.get('/marketplace/categories');
    (cats.categories || []).forEach(c =>
      catSel.insertAdjacentHTML('beforeend', `<option value="${c.id}">${esc(c.name)}</option>`));
  } catch (e) { /* filters still work without categories */ }

  async function load() {
    const q = new URLSearchParams();
    ['search', 'category', 'location', 'minPrice', 'maxPrice', 'sort'].forEach(id => {
      const v = document.getElementById(id).value.trim();
      if (v) q.set(id, v);
    });
    try {
      const data = await api.get('/marketplace/products?' + q.toString());
      if (!data.products.length) { grid.innerHTML = '<p>No products found.</p>'; return; }
      grid.innerHTML = data.products.map(p => `
        <div class="product-card">
          <h3>${esc(p.title)}</h3>
          <div class="price">৳${esc(p.price_per_unit)} / ${esc(p.unit)}</div>
          <div class="meta">${esc(p.category)} • ${esc(p.location)}</div>
          <div class="meta">Available: ${esc(p.quantity)} ${esc(p.unit)} • Min order: ${esc(p.min_order_quantity)} ${esc(p.min_order_unit)}</div>
          <div class="meta">Seller: ${esc(p.seller_name)}</div>
          <a class="btn" href="product-details.html?id=${p.id}">View details</a>
        </div>`).join('');
    } catch (err) {
      grid.innerHTML = '<p>Could not load products. ' + esc(err.message) + '</p>';
    }
  }

  document.getElementById('filterForm').addEventListener('submit', e => { e.preventDefault(); load(); });
  load();
}

/* ================= product-details.html ================= */
async function initProductDetails() {
  const id = new URLSearchParams(location.search).get('id');
  const box = document.getElementById('productDetail');
  const msg = document.getElementById('msg');
  if (!id) { box.textContent = 'No product selected.'; return; }

  let p;
  try {
    p = (await api.get('/marketplace/products/' + id)).product;
  } catch (e) {
    box.textContent = 'Product not found.';
    return;
  }

  box.innerHTML = `
    <h2>${esc(p.title)}</h2>
    <p>${esc(p.description || 'No description provided.')}</p>
    <p class="price">৳${esc(p.price_per_unit)} / ${esc(p.unit)}</p>
    <p class="meta">${esc(p.category)} • ${esc(p.location)} • Seller: ${esc(p.seller_name)}</p>
    <p class="meta">Available: ${esc(p.quantity)} ${esc(p.unit)} • Minimum order: ${esc(p.min_order_quantity)} ${esc(p.min_order_unit)}</p>
    ${p.harvest_date ? `<p class="meta">Harvest date: ${esc(String(p.harvest_date).slice(0, 10))}</p>` : ''}`;

  const qty = document.getElementById('quantity');
  const price = document.getElementById('offered_price');
  const preview = document.getElementById('totalPreview');

  qty.min = p.min_order_quantity;
  qty.max = p.quantity;
  qty.value = p.min_order_quantity;
  price.value = p.price_per_unit;

  function updateTotal() {
    const total = (Number(qty.value) || 0) * (Number(price.value) || 0);
    preview.textContent = 'Estimated total: ৳' + total.toFixed(2);
  }
  qty.addEventListener('input', updateTotal);
  price.addEventListener('input', updateTotal);
  updateTotal();

  document.getElementById('requestForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const res = await api.post('/buyer/requests', {
        product_id: p.id,
        requested_quantity: qty.value,
        offered_price_per_unit: price.value,
        delivery_location: document.getElementById('delivery_location').value,
        delivery_deadline: document.getElementById('delivery_deadline').value,
        notes: document.getElementById('message').value
      });
      showMsg(msg, res.message || 'Request sent', true);
      e.target.reset();
      qty.value = p.min_order_quantity;
      price.value = p.price_per_unit;
      updateTotal();
    } catch (err) {
      showMsg(msg, err.message || 'Failed. Make sure you are logged in as a buyer.', false);
    }
  });
}

/* ================= buyer-dashboard.html ================= */
async function initBuyerDashboard() {
  let user;
  try {
    const me = await api.get('/auth/me');
    user = me.user || me;
  } catch (e) {
    location.href = 'login.html';
    return;
  }
  if (user.role !== 'buyer') { location.href = 'login.html'; return; }
  document.getElementById('welcome').textContent = 'Welcome, ' + (user.full_name || user.name);

  const body = document.getElementById('requestsBody');

  async function load() {
    try {
      const { requests } = await api.get('/buyer/requests');
      body.innerHTML = requests.length ? requests.map(r => `
        <tr>
          <td><a href="product-details.html?id=${r.product_id}">${esc(r.title)}</a></td>
          <td>${esc(r.seller_name)}</td>
          <td>${esc(r.requested_quantity)} ${esc(r.unit)}</td>
          <td>৳${esc(r.offered_price_per_unit)} (total ৳${esc(r.total_price)})</td>
          <td><span class="badge ${esc(r.status)}">${esc(r.status)}</span></td>
          <td>${r.status === 'pending'
            ? `<button class="mp-btn danger" data-withdraw="${r.id}">Withdraw</button>` : ''}</td>
        </tr>`).join('') : '<tr><td colspan="6">No requests yet.</td></tr>';
    } catch (err) {
      body.innerHTML = '<tr><td colspan="6">Could not load requests.</td></tr>';
    }
  }

  body.addEventListener('click', async e => {
    const id = e.target.dataset.withdraw;
    if (!id) return;
    if (!confirm('Withdraw this request?')) return;
    try {
      await api.post(`/buyer/requests/${id}/withdraw`, {});
      load();
    } catch (err) { alert(err.message || 'Could not withdraw'); }
  });

  load();
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('productGrid')) initMarketplace();
  if (document.getElementById('productDetail')) initProductDetails();
  if (document.getElementById('requestsBody')) initBuyerDashboard();
});