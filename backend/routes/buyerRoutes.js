const express = require('express');
const router = express.Router();
const buyer = require('../controllers/buyercontroller');
const { verifyToken, requireRole } = require('../middleware/auth'); // adjust names to match auth.js

// Public marketplace
router.get('/marketplace/categories', buyer.listCategories);
router.get('/marketplace/products', buyer.listProducts);
router.get('/marketplace/products/:id', buyer.getProduct);

// Buyer only
router.post('/buyer/requests', verifyToken, requireRole('buyer'), buyer.createRequest);
router.get('/buyer/requests', verifyToken, requireRole('buyer'), buyer.myRequests);
router.patch('/buyer/requests/:id/cancel', verifyToken, requireRole('buyer'), buyer.cancelRequest);

module.exports = router;