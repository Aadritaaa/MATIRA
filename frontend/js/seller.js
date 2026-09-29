/**
 * MATIRA Seller Dashboard (Developer 1 - Enhanced & Refined)
 */

let currentSeller = null;
let allProducts = [];
let allRequests = [];
let allHistory = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Enforce Authentication & Role Guard (Must be Farmer)
    currentSeller = await Auth.requireAuth('farmer');
    if (!currentSeller) return;

    // 2. Initialize UI Components & Header Info
    renderSellerHeader(currentSeller);

    // 3. Populate 64 Districts in District Dropdowns
    if (typeof Districts !== 'undefined') {
        Districts.populateDropdown('location', currentSeller.district || '', '-- Select Product District --');
        Districts.populateDropdown('edit_location', '', '-- Select District --');
        Districts.populateDropdown('prof_district', currentSeller.district || '', '-- Select Profile District --');
    }

    // 4. Tab Switching Setup
    setupTabs();

    // 5. Setup Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    }

    // 6. Unit synchronization (auto-set min_order_unit when unit changes)
    const addUnitSelect = document.getElementById('unit');
    const addMinUnitSelect = document.getElementById('min_order_unit');
    if (addUnitSelect && addMinUnitSelect) {
        addUnitSelect.addEventListener('change', () => {
            addMinUnitSelect.value = addUnitSelect.value;
        });
    }

    const editUnitSelect = document.getElementById('edit_unit');
    const editMinUnitSelect = document.getElementById('edit_min_order_unit');
    if (editUnitSelect && editMinUnitSelect) {
        editUnitSelect.addEventListener('change', () => {
            editMinUnitSelect.value = editUnitSelect.value;
        });
    }

    // 7. Initial Data Loading
    await loadCategories();
    await refreshDashboard();

    // 8. Setup Form Listeners & Modals
    setupProductForms();
    setupProfileForm();
});

/**
 * Render Header Banner Info
 */
function renderSellerHeader(user) {
    const nameEl = document.getElementById('sellerName');
    const phoneEl = document.getElementById('sellerPhone');
    const districtEl = document.getElementById('sellerDistrict');

    if (nameEl) nameEl.textContent = user.full_name || 'Farmer';
    if (phoneEl) phoneEl.textContent = user.phone || 'N/A';
    if (districtEl) districtEl.textContent = user.district || 'N/A';

    // Populate profile form fields
    const profName = document.getElementById('prof_full_name');
    const profPhone = document.getElementById('prof_phone');
    const profEmail = document.getElementById('prof_email');
    const profAddress = document.getElementById('prof_address');

    if (profName) profName.value = user.full_name || '';
    if (profPhone) profPhone.value = user.phone || '';
    if (profEmail) profEmail.value = user.email || '';
    if (profAddress) profAddress.value = user.address || '';
}

/**
 * Setup Tab Navigation
 */
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.classList.add('active');
        });
    });
}

/**
 * Refresh All Dashboard Data & Metrics
 */
async function refreshDashboard() {
    await Promise.all([
        loadMetrics(),
        loadMyProducts(),
        loadIncomingRequests(),
        loadSalesHistory()
    ]);
}

/**
 * Load KPI Summary Metrics
 */
async function loadMetrics() {
    try {
        const res = await API.get('/seller/metrics');
        if (res.success && res.metrics) {
            const m = res.metrics;
            setText('kpiTotalProducts', m.total_products);
            setText('kpiActiveProducts', m.active_products);
            setText('kpiPendingRequests', m.pending_requests);
            setText('kpiSalesVolume', `৳${Number(m.total_sales_volume).toLocaleString()}`);
            
            // Badges on tabs
            setText('tabProductsCount', m.total_products);
            setText('tabRequestsCount', m.pending_requests);
        }
    } catch (err) {
        console.error('Failed to load metrics:', err);
    }
}

/**
 * Load Categories into Select dropdowns
 */
async function loadCategories() {
    try {
        const res = await API.get('/categories');
        if (res.success && Array.isArray(res.categories)) {
            const addCatSelect = document.getElementById('category_id');
            const editCatSelect = document.getElementById('edit_category_id');
            const filterCatSelect = document.getElementById('filterCategory');

            const optionsHtml = res.categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

            if (addCatSelect) addCatSelect.innerHTML = `<option value="">-- Select Category --</option>` + optionsHtml;
            if (editCatSelect) editCatSelect.innerHTML = `<option value="">-- Select Category --</option>` + optionsHtml;
            if (filterCatSelect) filterCatSelect.innerHTML = `<option value="">All Categories</option>` + optionsHtml;
        }
    } catch (err) {
        console.error('Failed to load categories:', err);
    }
}

/**
 * Load Seller's Products
 */
async function loadMyProducts() {
    const container = document.getElementById('myProductsContainer');
    if (!container) return;

    try {
        const res = await API.get('/seller/products');
        if (res.success) {
            allProducts = res.products || [];
            renderProductsList(allProducts);
        }
    } catch (err) {
        container.innerHTML = `<p class="alert alert-danger">Failed to load products: ${escapeHtml(err.message)}</p>`;
    }
}

/**
 * Render Product List / Table
 */
function renderProductsList(products) {
    const container = document.getElementById('myProductsContainer');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 16px; color: var(--text-muted);">
                <div style="font-size: 2.5rem; margin-bottom: 10px;">🌾</div>
                <h3 style="color: var(--text-main); margin-bottom: 6px;">No products listed yet</h3>
                <p>Add your harvested crops to make them visible to verified business buyers.</p>
                <button onclick="openAddProductModal()" class="btn btn-primary btn-sm" style="margin-top: 14px;">+ Add First Product</button>
            </div>
        `;
        return;
    }

    const rows = products.map(p => {
        const minOrderFormatted = `${Number(p.min_order_quantity).toLocaleString()} ${escapeHtml(p.min_order_unit || p.unit || 'kg')}`;
        return `
        <tr>
            <td>
                <strong>${escapeHtml(p.title)}</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(p.description || 'No description')}</div>
            </td>
            <td><span class="badge badge-farmer">${escapeHtml(p.category_name || 'Crop')}</span></td>
            <td><strong>${Number(p.quantity).toLocaleString()}</strong> ${escapeHtml(p.unit)}</td>
            <td><strong>৳${Number(p.price_per_unit).toFixed(2)}</strong> / ${escapeHtml(p.unit)}</td>
            <td>${minOrderFormatted}</td>
            <td>📍 ${escapeHtml(p.location)}</td>
            <td>
                <span class="badge badge-${p.status === 'available' ? 'available' : 'sold_out'}">
                    ${p.status}
                </span>
            </td>
            <td>
                <div style="display: flex; gap: 6px;">
                    <button class="btn btn-secondary btn-sm" onclick="openEditProductModal(${p.id})">✏️ Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="confirmDeleteProduct(${p.id}, '${escapeHtml(p.title)}')">🗑️</button>
                </div>
            </td>
        </tr>
    `;}).join('');

    container.innerHTML = `
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Product Details</th>
                        <th>Category</th>
                        <th>Stock Qty</th>
                        <th>Asking Price</th>
                        <th>Min Order</th>
                        <th>District</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Filter Products by Search and Category
 */
function filterProducts() {
    const searchVal = document.getElementById('searchProduct')?.value.toLowerCase().trim() || '';
    const categoryVal = document.getElementById('filterCategory')?.value || '';
    const statusVal = document.getElementById('filterStatus')?.value || '';

    const filtered = allProducts.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchVal) || (p.location && p.location.toLowerCase().includes(searchVal));
        const matchesCat = !categoryVal || String(p.category_id) === String(categoryVal);
        const matchesStatus = !statusVal || p.status === statusVal;
        return matchesSearch && matchesCat && matchesStatus;
    });

    renderProductsList(filtered);
}

/**
 * Load Incoming Purchase Requests
 */
async function loadIncomingRequests() {
    const container = document.getElementById('incomingRequestsContainer');
    if (!container) return;

    try {
        const res = await API.get('/seller/requests');
        if (res.success) {
            allRequests = res.requests || [];
            renderIncomingRequests(allRequests);
        }
    } catch (err) {
        container.innerHTML = `<p class="alert alert-danger">Failed to load purchase requests: ${escapeHtml(err.message)}</p>`;
    }
}

/**
 * Render Incoming Purchase Requests
 */
function renderIncomingRequests(requests) {
    const container = document.getElementById('incomingRequestsContainer');
    if (!container) return;

    if (requests.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 16px; color: var(--text-muted);">
                <div style="font-size: 2.5rem; margin-bottom: 10px;">📫</div>
                <h3 style="color: var(--text-main); margin-bottom: 6px;">No Purchase Requests Yet</h3>
                <p>When buyers submit purchase requests for your crops, they will appear here for review.</p>
            </div>
        `;
        return;
    }

    const cards = requests.map(r => {
        const isPending = r.status === 'pending' || r.status === 'under_review';
        return `
            <div class="request-card">
                <div class="request-header">
                    <div>
                        <div class="request-product-title">🌾 ${escapeHtml(r.product_title)}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Request ID: #${r.id} • ${new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                    <span class="badge ${r.status === 'accepted' ? 'badge-available' : (r.status === 'rejected' ? 'badge-sold_out' : 'badge-buyer')}">
                        ${r.status}
                    </span>
                </div>

                <div class="request-meta-grid">
                    <div>
                        <span class="request-meta-label">Buyer Name</span>
                        <span class="request-meta-value">${escapeHtml(r.buyer_name)}</span>
                    </div>
                    <div>
                        <span class="request-meta-label">Buyer Phone</span>
                        <span class="request-meta-value">${escapeHtml(r.buyer_phone || 'N/A')}</span>
                    </div>
                    <div>
                        <span class="request-meta-label">Requested Quantity</span>
                        <span class="request-meta-value">${Number(r.requested_quantity).toLocaleString()} ${escapeHtml(r.product_unit)}</span>
                    </div>
                    <div>
                        <span class="request-meta-label">Offered Price</span>
                        <span class="request-meta-value">৳${Number(r.offered_price_per_unit).toFixed(2)} / ${escapeHtml(r.product_unit)}</span>
                    </div>
                    <div>
                        <span class="request-meta-label">Total Deal Value</span>
                        <span class="request-meta-value" style="color: var(--primary-color);">৳${Number(r.total_price).toLocaleString()}</span>
                    </div>
                    <div>
                        <span class="request-meta-label">Delivery Location</span>
                        <span class="request-meta-value">${escapeHtml(r.delivery_location)}</span>
                    </div>
                </div>

                ${r.notes ? `
                    <div style="background: #f9fafb; padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-main);">
                        <strong>Buyer Notes:</strong> ${escapeHtml(r.notes)}
                    </div>
                ` : ''}

                ${isPending ? `
                    <div class="request-actions">
                        <button class="btn btn-primary btn-sm btn-block" onclick="updateRequestStatus(${r.id}, 'accepted')">
                            ✅ Accept Request
                        </button>
                        <button class="btn btn-danger btn-sm btn-block" onclick="updateRequestStatus(${r.id}, 'rejected')">
                            ❌ Decline
                        </button>
                    </div>
                ` : `
                    <div style="font-size: 0.85rem; text-align: center; color: var(--text-muted); font-style: italic;">
                        Status: ${r.status.toUpperCase()}
                    </div>
                `}
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="requests-grid">${cards}</div>`;
}

/**
 * Action: Update Purchase Request Status (Accept/Reject)
 */
async function updateRequestStatus(requestId, status) {
    const confirmMsg = status === 'accepted' 
        ? 'Are you sure you want to ACCEPT this purchase request? This will create an agreed deal.' 
        : 'Are you sure you want to DECLINE this purchase request?';

    if (!confirm(confirmMsg)) return;

    try {
        const res = await API.put(`/seller/requests/${requestId}/status`, { status });
        if (res.success) {
            alert(res.message);
            await refreshDashboard();
        }
    } catch (err) {
        alert(`Failed to update request: ${err.message}`);
    }
}

/**
 * Load Sales & Order History
 */
async function loadSalesHistory() {
    const container = document.getElementById('salesHistoryContainer');
    if (!container) return;

    try {
        const res = await API.get('/seller/history');
        if (res.success) {
            allHistory = res.history || [];
            renderSalesHistory(allHistory);
        }
    } catch (err) {
        container.innerHTML = `<p class="alert alert-danger">Failed to load sales history: ${escapeHtml(err.message)}</p>`;
    }
}

/**
 * Render Sales History Table
 */
function renderSalesHistory(history) {
    const container = document.getElementById('salesHistoryContainer');
    if (!container) return;

    if (history.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 16px; color: var(--text-muted);">
                <div style="font-size: 2.5rem; margin-bottom: 10px;">📜</div>
                <h3 style="color: var(--text-main); margin-bottom: 6px;">No Transaction History Yet</h3>
                <p>When your accepted purchase requests convert into completed deals, they will appear here.</p>
            </div>
        `;
        return;
    }

    const rows = history.map(h => `
        <tr>
            <td><strong>Deal #${h.deal_id}</strong></td>
            <td>🌾 ${escapeHtml(h.product_title)}</td>
            <td>${escapeHtml(h.buyer_name)} (${escapeHtml(h.buyer_district)})</td>
            <td>${Number(h.agreed_quantity).toLocaleString()} ${escapeHtml(h.product_unit)}</td>
            <td>৳${Number(h.agreed_price_per_unit).toFixed(2)}</td>
            <td><strong style="color: var(--primary-color);">৳${Number(h.total_amount).toLocaleString()}</strong></td>
            <td><span class="badge badge-${h.deal_status === 'agreed' || h.deal_status === 'completed' ? 'available' : 'buyer'}">${h.deal_status}</span></td>
            <td>${new Date(h.deal_date).toLocaleDateString()}</td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Deal ID</th>
                        <th>Product</th>
                        <th>Buyer</th>
                        <th>Agreed Qty</th>
                        <th>Agreed Price</th>
                        <th>Total Value</th>
                        <th>Deal Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Setup Add & Edit Product Forms
 */
function setupProductForms() {
    // Add Product Form Submit
    const addForm = document.getElementById('addProductForm');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const alertEl = document.getElementById('addProductAlert');
            const submitBtn = document.getElementById('submitAddProductBtn');

            const title = document.getElementById('add_title').value.trim();
            const category_id = document.getElementById('category_id').value;
            const quantity = document.getElementById('quantity').value;
            const unit = document.getElementById('unit').value;
            const price_per_unit = document.getElementById('price_per_unit').value;
            const min_order_quantity = document.getElementById('min_order_quantity').value || '1';
            const min_order_unit = document.getElementById('min_order_unit')?.value || unit || 'kg';
            const location = document.getElementById('location').value.trim();
            const harvest_date = document.getElementById('harvest_date').value;
            const description = document.getElementById('description').value.trim();

            if (!title || !category_id || !quantity || !price_per_unit || !location) {
                if (alertEl) {
                    alertEl.textContent = 'Please fill in all required fields.';
                    alertEl.style.display = 'block';
                }
                return;
            }

            try {
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }
                const res = await API.post('/seller/products', {
                    title,
                    category_id: parseInt(category_id, 10),
                    quantity: parseFloat(quantity),
                    unit,
                    price_per_unit: parseFloat(price_per_unit),
                    min_order_quantity: parseFloat(min_order_quantity),
                    min_order_unit,
                    location,
                    harvest_date: harvest_date || null,
                    description: description || null
                });

                if (res.success) {
                    alert('🌾 Product created successfully!');
                    addForm.reset();
                    closeModal('addProductModal');
                    await refreshDashboard();
                }
            } catch (err) {
                if (alertEl) {
                    alertEl.textContent = err.message || 'Failed to create product.';
                    alertEl.style.display = 'block';
                } else {
                    alert(err.message);
                }
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Product'; }
            }
        });
    }

    // Edit Product Form Submit
    const editForm = document.getElementById('editProductForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const productId = document.getElementById('edit_product_id').value;
            const alertEl = document.getElementById('editProductAlert');
            const submitBtn = document.getElementById('submitEditProductBtn');

            const title = document.getElementById('edit_title').value.trim();
            const category_id = document.getElementById('edit_category_id').value;
            const quantity = document.getElementById('edit_quantity').value;
            const unit = document.getElementById('edit_unit').value;
            const price_per_unit = document.getElementById('edit_price_per_unit').value;
            const min_order_quantity = document.getElementById('edit_min_order_quantity').value;
            const min_order_unit = document.getElementById('edit_min_order_unit')?.value || unit || 'kg';
            const location = document.getElementById('edit_location').value.trim();
            const status = document.getElementById('edit_status').value;
            const description = document.getElementById('edit_description').value.trim();

            try {
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Updating...'; }
                const res = await API.put(`/seller/products/${productId}`, {
                    title,
                    category_id: parseInt(category_id, 10),
                    quantity: parseFloat(quantity),
                    unit,
                    price_per_unit: parseFloat(price_per_unit),
                    min_order_quantity: parseFloat(min_order_quantity),
                    min_order_unit,
                    location,
                    status,
                    description: description || null
                });

                if (res.success) {
                    alert('Product updated successfully!');
                    closeModal('editProductModal');
                    await refreshDashboard();
                }
            } catch (err) {
                if (alertEl) {
                    alertEl.textContent = err.message || 'Failed to update product.';
                    alertEl.style.display = 'block';
                } else {
                    alert(err.message);
                }
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Update Product'; }
            }
        });
    }
}

/**
 * Setup Profile Form
 */
function setupProfileForm() {
    const profForm = document.getElementById('profileForm');
    if (profForm) {
        profForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const alertEl = document.getElementById('profileAlert');
            const submitBtn = document.getElementById('submitProfileBtn');

            const full_name = document.getElementById('prof_full_name').value.trim();
            const email = document.getElementById('prof_email').value.trim();
            const district = document.getElementById('prof_district').value.trim();
            const address = document.getElementById('prof_address').value.trim();

            try {
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Updating...'; }
                const res = await API.put('/auth/profile', {
                    full_name,
                    email: email || null,
                    district,
                    address: address || null
                });

                if (res.success && res.user) {
                    currentSeller = res.user;
                    Auth.setSession(Auth.getToken(), res.user);
                    renderSellerHeader(res.user);
                    if (alertEl) {
                        alertEl.className = 'alert alert-success';
                        alertEl.textContent = 'Profile updated successfully!';
                        alertEl.style.display = 'block';
                    }
                }
            } catch (err) {
                if (alertEl) {
                    alertEl.className = 'alert alert-danger';
                    alertEl.textContent = err.message || 'Failed to update profile.';
                    alertEl.style.display = 'block';
                }
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Profile Changes'; }
            }
        });
    }
}

/**
 * Open Modal: Add Product
 */
window.openAddProductModal = function() {
    const modal = document.getElementById('addProductModal');
    const alertEl = document.getElementById('addProductAlert');
    if (alertEl) alertEl.style.display = 'none';
    if (modal) modal.classList.add('active');

    // Pre-fill location default with seller's district in 64 districts dropdown
    if (typeof Districts !== 'undefined' && currentSeller && currentSeller.district) {
        Districts.populateDropdown('location', currentSeller.district, '-- Select Product District --');
    }
};

/**
 * Open Modal: Edit Product
 */
window.openEditProductModal = async function(productId) {
    const modal = document.getElementById('editProductModal');
    const alertEl = document.getElementById('editProductAlert');
    if (alertEl) alertEl.style.display = 'none';

    try {
        const res = await API.get(`/seller/products/${productId}`);
        if (res.success && res.product) {
            const p = res.product;
            document.getElementById('edit_product_id').value = p.id;
            document.getElementById('edit_title').value = p.title;
            document.getElementById('edit_category_id').value = p.category_id;
            document.getElementById('edit_quantity').value = p.quantity;
            document.getElementById('edit_unit').value = p.unit || 'kg';
            document.getElementById('edit_price_per_unit').value = p.price_per_unit;
            document.getElementById('edit_min_order_quantity').value = p.min_order_quantity;
            document.getElementById('edit_min_order_unit').value = p.min_order_unit || p.unit || 'kg';
            
            // Populate district in edit dropdown
            if (typeof Districts !== 'undefined') {
                Districts.populateDropdown('edit_location', p.location || '', '-- Select District --');
            }

            document.getElementById('edit_status').value = p.status;
            document.getElementById('edit_description').value = p.description || '';

            if (modal) modal.classList.add('active');
        }
    } catch (err) {
        alert(`Failed to load product for editing: ${err.message}`);
    }
};

/**
 * Action: Delete Product
 */
window.confirmDeleteProduct = async function(productId, productTitle) {
    if (!confirm(`Are you sure you want to delete the product "${productTitle}"? This cannot be undone.`)) {
        return;
    }

    try {
        const res = await API.delete(`/seller/products/${productId}`);
        if (res.success) {
            alert(res.message);
            await refreshDashboard();
        }
    } catch (err) {
        alert(`Failed to delete product: ${err.message}`);
    }
};

/**
 * Close Modal
 */
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
};

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
