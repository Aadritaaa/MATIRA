const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
    console.log('--- STARTING DEV 1 MILESTONE VERIFICATION TESTS ---');

    const timestamp = Date.now();
    const farmerPhone = `0171${Math.floor(1000000 + Math.random() * 9000000)}`;
    const farmerEmail = `farmer_${timestamp}@matira.local`;
    const buyerPhone = `0181${Math.floor(1000000 + Math.random() * 9000000)}`;
    const password = 'SecretPassword123';

    // TEST 1: Register Farmer
    console.log('\n[1] Testing Farmer Registration...');
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            full_name: 'Farmer Rahim Uddin',
            phone: farmerPhone,
            email: farmerEmail,
            password: password,
            role: 'farmer',
            district: 'Rajshahi'
        })
    });
    const regData = await regRes.json();
    console.log('Registration Response:', regData);
    assert.strictEqual(regRes.status, 201, 'Registration should return 201 Created');
    assert.strictEqual(regData.success, true);
    assert.ok(regData.token, 'Token should be returned');
    assert.strictEqual(regData.user.role, 'farmer');
    assert.strictEqual(regData.user.full_name, 'Farmer Rahim Uddin');

    // TEST 2: Register with duplicate phone should fail (409)
    console.log('\n[2] Testing Duplicate Phone Registration (Should Fail 409)...');
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            full_name: 'Duplicate Rahim',
            phone: farmerPhone,
            password: password,
            role: 'farmer',
            district: 'Rajshahi'
        })
    });
    const dupData = await dupRes.json();
    console.log('Duplicate Reg Response:', dupData);
    assert.strictEqual(dupRes.status, 409, 'Duplicate phone should return 409 Conflict');
    assert.strictEqual(dupData.success, false);

    // TEST 3: Login with wrong password should fail (401)
    console.log('\n[3] Testing Login with Wrong Password (Should Fail 401)...');
    const wrongLoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            identifier: farmerPhone,
            password: 'WrongPassword'
        })
    });
    const wrongLoginData = await wrongLoginRes.json();
    console.log('Wrong Password Response:', wrongLoginData);
    assert.strictEqual(wrongLoginRes.status, 401);
    assert.strictEqual(wrongLoginData.success, false);

    // TEST 4: Login with correct credentials
    console.log('\n[4] Testing Login with Correct Credentials...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            identifier: farmerPhone,
            password: password
        })
    });
    const loginData = await loginRes.json();
    console.log('Login Response:', loginData);
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginData.success, true);
    const farmerToken = loginData.token;

    // TEST 5: GET /api/auth/me (Current User Profile)
    console.log('\n[5] Testing GET /api/auth/me with Farmer Token...');
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${farmerToken}` }
    });
    const meData = await meRes.json();
    console.log('Current User Profile:', meData);
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meData.user.full_name, 'Farmer Rahim Uddin');
    assert.strictEqual(meData.user.role, 'farmer');
    assert.strictEqual(meData.user.district, 'Rajshahi');

    // TEST 6: Add Product without authentication should fail (401)
    console.log('\n[6] Testing Add Product Unauthenticated (Should Fail 401)...');
    const unauthProdRes = await fetch(`${BASE_URL}/seller/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: 'Potato',
            category_id: 1,
            quantity: 500,
            unit: 'kg',
            price_per_unit: 35,
            min_order_quantity: 10,
            location: 'Rajshahi'
        })
    });
    assert.strictEqual(unauthProdRes.status, 401, 'Unauthenticated product creation should return 401');

    // TEST 7: Register a Buyer and test role authorization restriction
    console.log('\n[7] Testing Buyer Role Cannot Create Products (Should Fail 403)...');
    const regBuyerRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            full_name: 'Buyer Karim Enterprise',
            phone: buyerPhone,
            password: password,
            role: 'buyer',
            district: 'Dhaka'
        })
    });
    const buyerData = await regBuyerRes.json();
    const buyerToken = buyerData.token;

    const buyerProdRes = await fetch(`${BASE_URL}/seller/products`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${buyerToken}`
        },
        body: JSON.stringify({
            title: 'Potato',
            category_id: 1,
            quantity: 500,
            unit: 'kg',
            price_per_unit: 35,
            min_order_quantity: 10,
            location: 'Dhaka'
        })
    });
    const buyerProdData = await buyerProdRes.json();
    console.log('Buyer Product Creation Attempt:', buyerProdData);
    assert.strictEqual(buyerProdRes.status, 403, 'Buyer should receive 403 Forbidden on seller product creation');

    // TEST 8: Farmer adds Product (Potato, 500kg @ 35 BDT)
    console.log('\n[8] Testing Farmer Adds Product (Potato, 500kg @ 35 BDT)...');
    const createProdRes = await fetch(`${BASE_URL}/seller/products`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${farmerToken}`
        },
        body: JSON.stringify({
            title: 'Potato',
            category_id: 1,
            quantity: 500,
            unit: 'kg',
            price_per_unit: 35,
            min_order_quantity: 10,
            location: 'Rajshahi',
            description: 'Fresh Diamant variety potato directly from Rajshahi cold storage'
        })
    });
    const createProdData = await createProdRes.json();
    console.log('Created Product Response:', createProdData);
    assert.strictEqual(createProdRes.status, 201);
    assert.strictEqual(createProdData.success, true);
    assert.strictEqual(createProdData.product.title, 'Potato');
    assert.strictEqual(Number(createProdData.product.quantity), 500);
    assert.strictEqual(Number(createProdData.product.price_per_unit), 35);
    assert.strictEqual(createProdData.product.location, 'Rajshahi');

    // TEST 9: Farmer fetches My Products
    console.log('\n[9] Testing Farmer GET /api/seller/products...');
    const getProdsRes = await fetch(`${BASE_URL}/seller/products`, {
        headers: { 'Authorization': `Bearer ${farmerToken}` }
    });
    const getProdsData = await getProdsRes.json();
    console.log('Farmer Products List:', getProdsData);
    assert.strictEqual(getProdsRes.status, 200);
    assert.strictEqual(getProdsData.success, true);
    assert.ok(getProdsData.products.length >= 1);
    assert.strictEqual(getProdsData.products[0].title, 'Potato');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
}

runTests().catch(err => {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
});
