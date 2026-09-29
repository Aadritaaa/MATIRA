const assert = require('assert');
const db = require('./backend/config/db');

const BASE_URL = 'http://localhost:5000/api';

async function runImprovementTests() {
    console.log('=====================================================');
    console.log('🚀 TESTING DEVELOPER 1 REFINEMENTS & IMPROVEMENTS');
    console.log('=====================================================');

    const timestamp = Date.now();
    const farmerPhone = `0173${Math.floor(1000000 + Math.random() * 9000000)}`;
    const farmerEmail = `farmer_improved_${timestamp}@matira.local`;
    const password = 'SecureFarmerPassword2026';

    // 1. TEST CATEGORIES (Should be 12 expanded categories)
    console.log('\n[1] Testing GET /api/categories for 12 expanded categories...');
    const catRes = await fetch(`${BASE_URL}/categories`);
    const catData = await catRes.json();
    assert.strictEqual(catRes.status, 200);
    assert.strictEqual(catData.success, true);
    console.log(`Found ${catData.categories.length} categories.`);
    assert.ok(catData.categories.length >= 12, 'Should have at least 12 categories');
    const categoryNames = catData.categories.map(c => c.name);
    console.log('Categories:', categoryNames.join(', '));
    assert.ok(categoryNames.includes('Rice & Grains'));
    assert.ok(categoryNames.includes('Meat & Livestock'));
    assert.ok(categoryNames.includes('Fish & Aquaculture'));
    assert.ok(categoryNames.includes('Egg & Dairy Products'));
    console.log('✅ Categories expansion verified.');

    // 2. REGISTER FARMER IN A SPECIFIC DISTRICT
    console.log('\n[2] Testing Farmer Registration with District (Rajshahi)...');
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            full_name: 'Farmer Tariqul Islam',
            phone: farmerPhone,
            email: farmerEmail,
            password: password,
            role: 'farmer',
            district: 'Rajshahi',
            address: 'Paba, Rajshahi'
        })
    });
    const regData = await regRes.json();
    assert.strictEqual(regRes.status, 201);
    const farmerToken = regData.token;
    console.log('✅ Farmer registered with token.');

    // 3. CREATE PRODUCT 1: Standard kg + kg min order
    // Potato | Vegetables | 500 kg | 35 BDT/kg | Min: 10 kg | Rajshahi
    console.log('\n[3] Testing Product 1 (Potato: 500 kg, Min Order: 10 kg)...');
    const vegCategory = catData.categories.find(c => c.name === 'Vegetables');
    const prod1Res = await fetch(`${BASE_URL}/seller/products`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${farmerToken}`
        },
        body: JSON.stringify({
            title: 'Fresh Red Potato',
            category_id: vegCategory.id,
            quantity: 500,
            unit: 'kg',
            price_per_unit: 35.00,
            min_order_quantity: 10,
            min_order_unit: 'kg',
            location: 'Rajshahi',
            description: 'Fresh seasonal potatoes from Rajshahi farm'
        })
    });
    const prod1Data = await prod1Res.json();
    assert.strictEqual(prod1Res.status, 201);
    assert.strictEqual(prod1Data.product.title, 'Fresh Red Potato');
    assert.strictEqual(Number(prod1Data.product.quantity), 500);
    assert.strictEqual(prod1Data.product.unit, 'kg');
    assert.strictEqual(Number(prod1Data.product.min_order_quantity), 10);
    assert.strictEqual(prod1Data.product.min_order_unit, 'kg');
    console.log('✅ Product 1 created and verified:', prod1Data.product.title, `${prod1Data.product.quantity} ${prod1Data.product.unit}`);

    // 4. CREATE PRODUCT 2: Gram Unit & Gram Min Order
    // Organic Oyster Mushroom / Spices | 5000 gram | 0.80 BDT/gram | Min: 500 gram | Bogura
    console.log('\n[4] Testing Product 2 with GRAM unit (5000 gram, Min Order: 500 gram)...');
    const spiceCategory = catData.categories.find(c => c.name === 'Spices & Herbs') || vegCategory;
    const prod2Res = await fetch(`${BASE_URL}/seller/products`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${farmerToken}`
        },
        body: JSON.stringify({
            title: 'Organic Saffron & Dried Ginger Powder',
            category_id: spiceCategory.id,
            quantity: 5000,
            unit: 'gram',
            price_per_unit: 0.85,
            min_order_quantity: 500,
            min_order_unit: 'gram',
            location: 'Bogura',
            description: 'Finely ground natural ginger and spice mix'
        })
    });
    const prod2Data = await prod2Res.json();
    assert.strictEqual(prod2Res.status, 201);
    assert.strictEqual(prod2Data.product.title, 'Organic Saffron & Dried Ginger Powder');
    assert.strictEqual(Number(prod2Data.product.quantity), 5000);
    assert.strictEqual(prod2Data.product.unit, 'gram');
    assert.strictEqual(Number(prod2Data.product.min_order_quantity), 500);
    assert.strictEqual(prod2Data.product.min_order_unit, 'gram');
    assert.strictEqual(prod2Data.product.location, 'Bogura');
    console.log('✅ Product 2 with GRAM units created and verified in MySQL!');

    // 5. TEST INVALID MIN ORDER / QUANTITY VALIDATION (Negative or zero should fail 400)
    console.log('\n[5] Testing Validation (Negative Quantity & Min Order should fail 400)...');
    const invalidProdRes = await fetch(`${BASE_URL}/seller/products`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${farmerToken}`
        },
        body: JSON.stringify({
            title: 'Invalid Crop',
            category_id: vegCategory.id,
            quantity: -50,
            unit: 'kg',
            price_per_unit: 30,
            min_order_quantity: 0,
            location: 'Dhaka'
        })
    });
    assert.strictEqual(invalidProdRes.status, 400, 'Invalid quantity should return 400 Bad Request');
    console.log('✅ Validation correctly rejected invalid input.');

    // 6. TEST PRODUCT UPDATE (PUT /api/seller/products/:id) WITH MIN ORDER UNIT
    console.log('\n[6] Testing Product Update with min_order_unit...');
    const prod2Id = prod2Data.product.id;
    const updateRes = await fetch(`${BASE_URL}/seller/products/${prod2Id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${farmerToken}`
        },
        body: JSON.stringify({
            quantity: 7500,
            min_order_quantity: 1000,
            min_order_unit: 'gram'
        })
    });
    const updateData = await updateRes.json();
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(Number(updateData.product.quantity), 7500);
    assert.strictEqual(Number(updateData.product.min_order_quantity), 1000);
    assert.strictEqual(updateData.product.min_order_unit, 'gram');
    console.log('✅ Product update verified with min_order_unit.');

    // 7. DIRECT DATABASE VERIFICATION IN MYSQL
    console.log('\n[7] Checking MySQL Database Directly...');
    const [dbRows] = await db.query(
        'SELECT id, title, quantity, unit, min_order_quantity, min_order_unit, location FROM products WHERE id IN (?, ?)',
        [prod1Data.product.id, prod2Id]
    );
    console.log('MySQL Records in `products`:');
    console.table(dbRows);
    assert.strictEqual(dbRows.length, 2);

    console.log('\n=====================================================');
    console.log('🎉 ALL IMPROVEMENTS & REFINEMENT TESTS PASSED 100%! 🎉');
    console.log('=====================================================');
    await db.end();
}

runImprovementTests()
    .then(() => process.exit(0))
    .catch(async err => {
        console.error('❌ Test failed:', err);
        try { await db.end(); } catch (e) {}
        process.exit(1);
    });
