const express = require('express');
const pool = require('../models/db');
const { createCheckoutSession } = require('../utils/stripe');
const router = express.Router();

router.post('/', async (req, res) => {
    const { productId } = req.body;
    try {
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

        const session = await createCheckoutSession(result.rows[0]);
        res.json({ url: session.url });
    } catch (err) {
        res.status(500).json({ error: 'Checkout failed' });
    }
});
module.exports = router;