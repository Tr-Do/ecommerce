if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const Design = require('./models/design');
const sanitizeV5 = require('./utils/mongoSanitizeV5.js');
const express = require('express');
const ejsMate = require('ejs-mate');
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const { AppError } = require('./utils/AppError');
const productsRoute = require('./routes/product');
const usersRoute = require('./routes/users.js');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const helmet = require('helmet');

mongoose.connect('mongodb://localhost:27017/terrarium');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error: '));
db.once('open', () => {
    console.log('Database connected');
});

const app = express();
app.set('query parser', 'extended');
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(sanitizeV5({ replaceWith: '_' }));
app.use(methodOverride('_method'));

const sessionConfig = {
    name: 'session',
    secret: "thisisasecret",
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 604800000,
        maxAge: 604800000
    }
}
app.use(session(sessionConfig));
app.use(flash());
app.use(helmet({ contentSecurityPolicy: false }));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()))

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

app.use('/', usersRoute);
app.use('/products', productsRoute);

app.get('/', (req, res) => {
    res.render('home');
})

app.post('/cart', (req, res) => {
    const { size, productId } = req.body;
    if (!productId || !size) return res.status(400).send('Invalid cart data');
    if (!req.session.cart) req.session.cart = { items: [] };
    const cart = req.session.cart.items;
    const currentItem = cart.find(item => item.productId === productId && item.size === size);
    if (currentItem) {
        currentItem.quantity += 1
    } else {
        cart.push({ productId, size, quantity: 1 });
    }
    res.redirect('/cart');
})

app.get('/cart', async (req, res) => {
    const cart = req.session.cart || { items: [] };
    const productIds = cart.items.map(i => i.productId);
    const products = await Design.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map(p => [String(p._id), p]));
    const item = cart.items.map(i => ({ ...i, product: productMap.get(String(i.productId)) }));
    res.render('cart/index', { cart: { items: item } });
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