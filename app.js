const express = require('express');
const ejsMate = require('ejs-mate');
const path = require('path');
const mongoose = require('mongoose');
const Design = require('./models/design');

mongoose.connect('mongodb://localhost:27017/terrarium');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error: '));
db.once('open', () => {
    console.log('Database connected');
});


const app = express();
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', async (req, res) => {
    const products = await Design.find({});
    res.render('home', { products });
})

app.get('/product/new', (req, res) => {
    res.render('designs/new');
})

app.post('/product', async (req, res) => {
    const product = new Design(req.body.product);
    await product.save();
    res.redirect(`product/${product._id}`);
})

app.get('/product/:id', async (req, res) => {
    const product = await Design.findById(req.params.id);
    res.render('designs/show', { product });
})

// app.use((req, res) => {
//     res.send('404 NOT FOUND');
// })

app.listen(3000, () => {
    console.log('Serving port 3000')
})