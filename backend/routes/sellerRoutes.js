const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');
const { verifyToken, requireRole } = require('../middleware/auth');

// All seller routes require authentication and the 'farmer' role
router.use(verifyToken, requireRole('farmer'));

// 1. Dashboard Metrics
router.get('/metrics', sellerController.getSellerMetrics);

// 2. Product Management (CRUD)
router.post('/products', sellerController.createProduct);
router.get('/products', sellerController.getMyProducts);
router.get('/products/:id', sellerController.getProductById);
router.put('/products/:id', sellerController.updateProduct);
router.delete('/products/:id', sellerController.deleteProduct);

// 3. Purchase Request Handling
router.get('/requests', sellerController.getIncomingRequests);
router.put('/requests/:id/status', sellerController.updateRequestStatus);

// 4. Sales & Order History
router.get('/history', sellerController.getSellerHistory);

module.exports = router;
