const assert = require('assert');
const db = require('./backend/config/db');

const BASE_URL = 'http://localhost:5000/api';

async function runDev1FullTests() {
    console.log('=====================================================');
    console.log('🌾 STARTING DEV 1 FULL SUITE VERIFICATION TESTS');
    console.log('=====================================================');

    const timestamp = Date.now();
    const farmerPhone = `0172${Math.floor(1000000 + Math.random() * 9000000)}`;
    const farmerEmail = `farmer_full_${timestamp}@matira.local`;
    const buyerPhone = `0182${Math.floor(1000000 + Math.random() * 9000000)}`;
    const password = 'StrongPassword2026';

    // 1. REGISTER FARMER
    console.log('\n[1] Testing Farmer Registration...');
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            full_name: 'Al-Amin Mia',
            phone: farmerPhone,
            email: farmerEmail,
            password: password,
            role: 'farmer',
            district: 'Bogura',
            address: 'Shibganj, Bogura'
        })
    });
    const regData = await regRes.json();
    assert.strictEqual(regRes.status, 201);
    assert.strictEqual(regData.success, true);
    const farmerToken = regData.token;
    const farmerId = regData.user.id;
    console.log('✅ Farmer Registered with ID:', farmerId);

    // 2. REGISTER BUYER
    console.log('\n[2] Testing Buyer Registration...');
    const regBuyerRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            full_name: 'SuperStore Ltd',
            phone: buyerPhone,
            password: password,
            role: 'buyer',
            district: 'Dhaka'
        })
    });
    const regBuyerData = await regBuyerRes.json();
    assert.strictEqual(regBuyerRes.status, 201);
    const buyerId = regBuyerData.user.id;
    const buyerToken = regBuyerData.token;
    console.log('✅ Buyer Registered with ID:', buyerId);

    // 3. GET CURRENT PROFILE (GET /api/auth/me)
    console.log('\n[3] Testing GET /api/auth/me...');
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${farmerToken}` }
    });
    const meData = await meRes.json();
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meData.user.full_name, 'Al-Amin Mia');
    assert.strictEqual(meData.user.role, 'farmer');
    console.log('✅ Profile successfully fetched.');

    // 4. UPDATE PROFILE (PUT /api/auth/profile)
    console.log('\n[4] Testing PUT /api/auth/profile...');
    const updateProfRes = await fetch(`${BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${farmerToken}`
        },
        body: JSON.stringify({
            full_name: 'Al-Amin Mia (Master Farmer)',
            district: 'Bogura',
            address: 'Village: Mokamtala, Upazila: Shibganj, Bogura',
            email: farmerEmail
        })
    });
    const updateProfData = await updateProfRes.json();
    assert.strictEqual(updateProfRes.status, 200);
    assert.strictEqual(updateProfData.user.full_name, 'Al-Amin Mia (Master Farmer)');
    console.log('✅ Profile successfully updated.');

    // 5. CREATE PRODUCT (POST /api/seller/products)
    console.log('\n[5] Testing Product Creation (POST /api/seller/products)...');
    const createProdRes = await fetch(`${BASE_URL}/seller/products`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${farmerToken}`
        },
        body: JSON.stringify({
            title: 'Bogura Red Diamond Potato',
            category_id: 1,
            quantity: 1200,
            unit: 'kg',
            price_per_unit: 32.50,
            min_order_quantity: 50,
            location: 'Bogura',
            description: 'Grade-A fresh harvested potato with excellent shelf life'
        })
    });
    const createProdData = await createProdRes.json();
    assert.strictEqual(createProdRes.status, 201);
    const productId = createProdData.product.id;
    console.log('✅ Product created with ID:', productId);

    // 6. GET SINGLE PRODUCT (GET /api/seller/products/:id)
    console.log('\n[6] Testing GET /api/seller/products/:id...');
    const getSingleRes = await fetch(`${BASE_URL}/seller/products/${productId}`, {
        headers: { 'Authorization': `Bearer ${farmerToken}` }
    });
    const getSingleData = await getSingleRes.json();
    assert.strictEqual(getSingleRes.status, 200);
    assert.strictEqual(getSingleData.product.title, 'Bogura Red Diamond Potato');
    console.log('✅ Single product fetched successfully.');

    // 7. UPDATE PRODUCT (PUT /api/seller/products/:id)
    console.log('\n[7] Testing Product Update (PUT /api/seller/products/:id)...');
    const updateProdRes = await fetch(`${BASE_URL}/seller/products/${productId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${farmerToken}`
        },
        body: JSON.stringify({
            title: 'Bogura Red Diamond Potato (Export Quality)',
            price_per_unit: 34.00,
            quantity: 1500,
            status: 'available'
        })
    });
    const updateProdData = await updateProdRes.json();
    assert.strictEqual(updateProdRes.status, 200);
    assert.strictEqual(updateProdData.product.title, 'Bogura Red Diamond Potato (Export Quality)');
    assert.strictEqual(Number(updateProdData.product.price_per_unit), 34);
    assert.strictEqual(Number(updateProdData.product.quantity), 1500);
    console.log('✅ Product updated successfully.');

    // 8. TEST SELLER METRICS (GET /api/seller/metrics)
    console.log('\n[8] Testing GET /api/seller/metrics...');
    const metricsRes = await fetch(`${BASE_URL}/seller/metrics`, {
        headers: { 'Authorization': `Bearer ${farmerToken}` }
    });
    const metricsData = await metricsRes.json();
    assert.strictEqual(metricsRes.status, 200);
    assert.ok(metricsData.metrics.total_products >= 1);
    console.log('✅ Metrics loaded:', metricsData.metrics);

    // 9. SIMULATE INCOMING PURCHASE REQUEST IN DB (To test seller request handling)
    console.log('\n[9] Simulating Incoming Purchase Request from Buyer in Database...');
    const [reqInsert] = await db.query(
        `INSERT INTO purchase_requests 
         (product_id, buyer_id, seller_id, requested_quantity, offered_price_per_unit, total_price, delivery_location, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [productId, buyerId, farmerId, 500, 33.00, 16500.00, 'Kawran Bazar, Dhaka']
    );
    const requestId = reqInsert.insertId;
    console.log('✅ Created Purchase Request ID:', requestId);

    // 10. GET INCOMING REQUESTS (GET /api/seller/requests)
    console.log('\n[10] Testing GET /api/seller/requests...');
    const getReqsRes = await fetch(`${BASE_URL}/seller/requests`, {
        headers: { 'Authorization': `Bearer ${farmerToken}` }
    });
    const getReqsData = await getReqsRes.json();
    assert.strictEqual(getReqsRes.status, 200);
    assert.ok(getReqsData.requests.length >= 1);
    const foundReq = getReqsData.requests.find(r => r.id === requestId);
    assert.ok(foundReq, 'Simulated request should appear in seller inbox');
    assert.strictEqual(foundReq.buyer_name, 'SuperStore Ltd');
    console.log('✅ Incoming purchase request found in seller inbox.');

    // 11. ACCEPT PURCHASE REQUEST (PUT /api/seller/requests/:id/status)
    console.log('\n[11] Testing Accept Purchase Request (PUT /api/seller/requests/:id/status)...');
    const acceptRes = await fetch(`${BASE_URL}/seller/requests/${requestId}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${farmerToken}`
        },
        body: JSON.stringify({ status: 'accepted' })
    });
    const acceptData = await acceptRes.json();
    assert.strictEqual(acceptRes.status, 200);
    assert.strictEqual(acceptData.status, 'accepted');
    console.log('✅ Purchase request accepted and deal automatically created.');

    // 12. GET SELLER SALES HISTORY (GET /api/seller/history)
    console.log('\n[12] Testing GET /api/seller/history...');
    const historyRes = await fetch(`${BASE_URL}/seller/history`, {
        headers: { 'Authorization': `Bearer ${farmerToken}` }
    });
    const historyData = await historyRes.json();
    assert.strictEqual(historyRes.status, 200);
    assert.ok(historyData.history.length >= 1);
    assert.strictEqual(historyData.history[0].buyer_name, 'SuperStore Ltd');
    assert.strictEqual(Number(historyData.history[0].total_amount), 16500.00);
    console.log('✅ Sales & Deal history verified.');

    // 13. CREATE A TEMPORARY PRODUCT & DELETE IT (DELETE /api/seller/products/:id)
    console.log('\n[13] Testing Product Deletion (DELETE /api/seller/products/:id)...');
    const tempProdRes = await fetch(`${BASE_URL}/seller/products`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${farmerToken}`
        },
        body: JSON.stringify({
            title: 'Temp Organic Brinjal',
            category_id: 1,
            quantity: 100,
            unit: 'kg',
            price_per_unit: 40.00,
            min_order_quantity: 10,
            location: 'Bogura'
        })
    });
    const tempProdData = await tempProdRes.json();
    const tempId = tempProdData.product.id;

    const delRes = await fetch(`${BASE_URL}/seller/products/${tempId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${farmerToken}` }
    });
    const delData = await delRes.json();
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delData.success, true);
    console.log('✅ Product deletion verified.');

    console.log('\n=====================================================');
    console.log('🎉 ALL DEVELOPER 1 END-TO-END TESTS PASSED 100%! 🎉');
    console.log('=====================================================');
}

runDev1FullTests()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Test failed:', err);
        process.exit(1);
    });
