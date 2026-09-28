const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');
const { verifyToken, requireRole } = require('../middleware/auth');

// All seller routes require authentication and the 'farmer' role
router.use(verifyToken, requireRole('farmer'));

router.post('/products', sellerController.createProduct);
router.get('/products', sellerController.getMyProducts);

module.exports = router;
