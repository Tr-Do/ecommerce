const express = require('express');
const ejsMate = require('ejs-mate');
const path = require('path');
const Joi = require('joi');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const Design = require('./models/design');
const AppError = require('./utils/AppError');

mongoose.connect('mongodb://localhost:27017/terrarium');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error: '));
db.once('open', () => {
    console.log('Database connected');
});

const throwError = (product) => {
    if (!product) {
        throw new AppError("Product not found", 404);
    }
}

const app = express();
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

const validateProduct = (req, res, next) => {
    const productSchema = Joi.object({
        product: Joi.object({
            name: Joi.string().required(),
            price: Joi.number().required().min(0),
            description: Joi.string().required()
        }).required()
    })
    const { error } = productSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(e => e.message).join(',')
        throw new AppError(msg, 400);
    }
    else {
        next();
    }
}

app.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    const products = await Design.find({})
        .skip(skip)
        .limit(limit);
    const totalProducts = await Design.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);
    res.render('home', { products, currentPage: page, totalPages });
});

app.get('/product/new', (req, res) => {
    res.render('designs/new');
})

app.post('/product', validateProduct, async (req, res) => {
    const product = new Design(req.body.product);
    await product.save();
    res.redirect(`/product/${product._id}`);
})

app.get('/product/:id', async (req, res) => {
    const product = await Design.findById(req.params.id);
    throwError(product);
    res.render('designs/show', { product });
})

app.get('/product/:id/edit', async (req, res) => {
    const product = await Design.findById(req.params.id);
    throwError(product);
    res.render('designs/edit', { product });
})

app.put('/product/:id', validateProduct, async (req, res) => {
    const { id } = req.params;
    const product = await Design.findByIdAndUpdate(id, { ...req.body.product });
    throwError(product);
    res.redirect(`/product/${product._id}`);
})

app.delete('/product/:id', async (req, res) => {
    const { id } = req.params;
    const product = await Design.findByIdAndDelete(id);
    throwError(product);
    res.redirect('/');
})

app.use((req, res, next) => {
    next(new AppError('Page not found', 404));
})

app.use((err, req, res, next) => {
    const { status = 500, message = 'Something went wrong' } = err;
    res.status(status).render('error', { err });
})

app.listen(3000, () => {
    console.log('Serving port 3000')
})