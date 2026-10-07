const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const ctrl = require('../controllers/dealController');

router.get('/', verifyToken, ctrl.listDeals);
router.post('/', verifyToken, ctrl.createDeal);
router.get('/:id', verifyToken, ctrl.getDeal);
router.put('/:id/status', verifyToken, ctrl.updateStatus);

module.exports = router;
