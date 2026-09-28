const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Public route to fetch all categories
router.get('/', async (req, res, next) => {
    try {
        const [categories] = await db.query('SELECT * FROM categories ORDER BY name ASC');
        res.status(200).json({
            success: true,
            categories
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
