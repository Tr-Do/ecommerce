require('dotenv').config();
console.log(process.env.DATABASE_URL);
console.log(typeof process.env.DATABASE_URL);
const express = require('express');
const dotenv = require('dotenv');
const pool = require('./models/db');
const checkoutRoutes = require('./routes/checkout');
app.use('/api/checkout', checkoutRoutes);

dotenv.config();
const app = express();
const productRoutes = require('./routes/products');

app.use('/api/products', productRoutes);
app.use(express.json());

app.get('/', (req, res) => {
    res.end('API running');
});

pool.query('SELECT NOW()', (err, result) => {
    if (err) console.error('Connection failed', err);
    else console.log('postgre connection at:', result.rows[0].now)
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Running on port: ${port}`));