/**
 * MATIRA Seller Dashboard Script (Developer 1)
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Enforce Authentication & Role Guard (Must be Farmer)
    const user = await Auth.requireAuth('farmer');
    if (!user) return;

    // 2. Set Seller Information in UI
    const sellerNameEl = document.getElementById('sellerName');
    const sellerRoleEl = document.getElementById('sellerRole');
    const sellerPhoneEl = document.getElementById('sellerPhone');
    const sellerDistrictEl = document.getElementById('sellerDistrict');

    if (sellerNameEl) sellerNameEl.textContent = user.full_name || 'Farmer';
    if (sellerRoleEl) sellerRoleEl.textContent = 'Farmer / Seller';
    if (sellerPhoneEl) sellerPhoneEl.textContent = user.phone || 'N/A';
    if (sellerDistrictEl) sellerDistrictEl.textContent = user.district || 'N/A';

    // 3. Setup Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    }

    // 4. Load Categories into Dropdown
    await loadCategories();

    // 5. Load Farmer's Products
    await loadMyProducts();

    // 6. Handle Add Product Form Submission
    const addProductForm = document.getElementById('addProductForm');
    const formAlert = document.getElementById('formAlert');
    const submitBtn = document.getElementById('submitProductBtn');

    if (addProductForm) {
        addProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAlert(formAlert);

            const title = document.getElementById('product_title').value.trim();
            const category_id = document.getElementById('category_id').value;
            const quantity = document.getElementById('quantity').value;
            const unit = document.getElementById('unit').value;
            const price_per_unit = document.getElementById('price_per_unit').value;
            const min_order_quantity = document.getElementById('min_order_quantity').value || '1';
            const location = document.getElementById('location').value.trim();
            const harvest_date = document.getElementById('harvest_date').value;
            const description = document.getElementById('description').value.trim();

            if (!title || !category_id || !quantity || !price_per_unit || !location) {
                showAlert(formAlert, 'Please fill in all required fields.', 'danger');
                return;
            }

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Saving Product...';
                }

                const res = await API.post('/seller/products', {
                    title,
                    category_id: parseInt(category_id, 10),
                    quantity: parseFloat(quantity),
                    unit,
                    price_per_unit: parseFloat(price_per_unit),
                    min_order_quantity: parseFloat(min_order_quantity),
                    location,
                    harvest_date: harvest_date || null,
                    description: description || null
                });

                if (res.success) {
                    showAlert(formAlert, '✅ Product added successfully!', 'success');
                    addProductForm.reset();
                    // Reset default location to farmer's district
                    if (document.getElementById('location') && user.district) {
                        document.getElementById('location').value = user.district;
                    }
                    // Refresh product list
                    await loadMyProducts();
                }
            } catch (error) {
                showAlert(formAlert, error.message || 'Failed to add product.', 'danger');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Add Product';
                }
            }
        });
    }

    // Pre-fill location default with seller's district
    const locationInput = document.getElementById('location');
    if (locationInput && user.district && !locationInput.value) {
        locationInput.value = user.district;
    }
});

/**
 * Fetch and populate product categories dropdown
 */
async function loadCategories() {
    const categorySelect = document.getElementById('category_id');
    if (!categorySelect) return;

    try {
        const res = await API.get('/categories');
        if (res.success && Array.isArray(res.categories)) {
            categorySelect.innerHTML = '<option value="">-- Select Category --</option>';
            res.categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.id;
                opt.textContent = cat.name;
                categorySelect.appendChild(opt);
            });
        }
    } catch (err) {
        console.error('Failed to load categories:', err);
    }
}

/**
 * Fetch and render the seller's products list
 */
async function loadMyProducts() {
    const productsContainer = document.getElementById('myProductsContainer');
    const productCountEl = document.getElementById('productCount');
    if (!productsContainer) return;

    try {
        productsContainer.innerHTML = '<p style="padding: 16px; color: var(--text-muted);">Loading products...</p>';
        const res = await API.get('/seller/products');

        if (res.success) {
            const products = res.products || [];
            if (productCountEl) productCountEl.textContent = `(${products.length})`;

            if (products.length === 0) {
                productsContainer.innerHTML = `
                    <div style="text-align: center; padding: 32px 16px; color: var(--text-muted);">
                        <p style="font-size: 1.1rem; margin-bottom: 8px;">🌾 No products listed yet.</p>
                        <p style="font-size: 0.85rem;">Use the form below to list your first harvest!</p>
                    </div>
                `;
                return;
            }

            // Render table of products
            let rowsHtml = products.map(p => `
                <tr>
                    <td><strong>${escapeHtml(p.title)}</strong></td>
                    <td><span class="badge badge-farmer">${escapeHtml(p.category_name || 'Crop')}</span></td>
                    <td>${Number(p.quantity).toLocaleString()} ${escapeHtml(p.unit)}</td>
                    <td><strong>৳${Number(p.price_per_unit).toFixed(2)}</strong> / ${escapeHtml(p.unit)}</td>
                    <td>${Number(p.min_order_quantity).toLocaleString()} ${escapeHtml(p.unit)}</td>
                    <td>${escapeHtml(p.location)}</td>
                    <td><span class="badge badge-${p.status === 'available' ? 'available' : 'sold_out'}">${p.status}</span></td>
                    <td>${new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
            `).join('');

            productsContainer.innerHTML = `
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Product Title</th>
                                <th>Category</th>
                                <th>Available Qty</th>
                                <th>Price</th>
                                <th>Min Order</th>
                                <th>Location</th>
                                <th>Status</th>
                                <th>Date Added</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            `;
        }
    } catch (err) {
        productsContainer.innerHTML = `<p class="alert alert-danger">Failed to load products: ${err.message}</p>`;
    }
}

function showAlert(el, msg, type = 'info') {
    if (!el) return;
    el.className = `alert alert-${type}`;
    el.textContent = msg;
    el.style.display = 'block';
}

function hideAlert(el) {
    if (el) el.style.display = 'none';
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
