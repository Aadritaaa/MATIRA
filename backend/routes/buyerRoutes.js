const express = require('express');
const router = express.Router();
const buyer = require('../controllers/buyerController');
const { verifyToken, requireRole } = require('../middleware/auth'); // match your auth.js exports

router.get('/marketplace/categories', buyer.listCategories);
router.get('/marketplace/products', buyer.listProducts);
router.get('/marketplace/products/:id', buyer.getProduct);

router.post('/buyer/requests', verifyToken, requireRole('buyer'), buyer.createRequest);
router.get('/buyer/requests', verifyToken, requireRole('buyer'), buyer.myRequests);
router.post('/buyer/requests/:id/withdraw', verifyToken, requireRole('buyer'), buyer.withdrawRequest);

module.exports = router;