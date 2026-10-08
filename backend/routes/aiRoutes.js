const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const ctrl = require('../controllers/aiAssessmentController');

router.post('/evaluate', verifyToken, ctrl.evaluate);
router.get('/request/:requestId', verifyToken, ctrl.getForRequest);
router.get('/reference-prices', verifyToken, ctrl.getReferencePrices);

module.exports = router;
