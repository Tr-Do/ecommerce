if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
// require('dotenv').config();

const sanitizeV5 = require('./utils/mongoSanitizeV5.js');
const express = require('express');
const ejsMate = require('ejs-mate');
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const { AppError } = require('./utils/AppError');
const productsRoute = require('./routes/product');
const usersRoute = require('./routes/users.js');
const cartRoute = require('./routes/cart.js');
const checkoutRoute = require('./routes/checkout.js');
const downloadRoute = require('./routes/download.js');
const reviewRoute = require('./routes/review.js');
const adminRoute = require('./routes/admin.js');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const helmet = require('helmet');
const checkout = require('./controllers/checkout.js');
const { setLocals, globalErrorHandler } = require('./middleware.js');
const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/terrarium';
const { MongoStore } = require('connect-mongo');

mongoose.connect(dbUrl);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error: '));
db.once('open', () => {
    console.log('Database connected');
});

const app = express();
app.set('query parser', 'extended');
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');


app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

// get user's IP
app.set('trust proxy', 1);

// store previous url in express storage -> pass it into url query -> pass it into middleware variable -> redirect to previous url
app.use((req, res, next) => {
    res.locals.currentUrl = req.originalUrl;
    next();
});

const store = MongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24 * 60 * 60,
    crypto: {
        secret: 'CsfYj6CQL5wUMHBqa4ur5W31mOplvUJe2dxBbJ4Q8OeFScbdlZddDRyFcqhO1r6A5TFcYyvz3fck2fRmTkCpV46FIs6WtWjH5p1M5KD9jBpuu06iS5IPKM0LRdq0XPwl'
    }
});

store.on('error', function (e) {
    console.log('Session store error', e);
})

const sessionConfig = {
    store,
    name: 'session',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 604800000,
        maxAge: 604800000
    }
}

// send raw bytes to stripe before sanitize req.body
app.post(
    '/checkout/webhook',
    express.raw({ type: 'application/json' }),
    checkout.webhook
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const sanitizer = sanitizeV5({ replaceWith: '_' });

app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/checkout/webhook') || req.originalUrl.startsWith('/downloads')) {
        return next()
    };
    if (
        req.originalUrl.startsWith('/checkout/webhook') ||
        req.originalUrl.startsWith('/downloads') ||
        req.originalUrl.startsWith('/cart')
    ) return next();
    return sanitizer(req, res, next);
})

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(helmet({
    contentSecurityPolicy: false,
    permissionsPolicy: false
}));

passport.use(new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(setLocals);

app.use('/checkout', checkoutRoute);
app.use('/downloads', downloadRoute);
app.use('/', usersRoute);
app.use('/products', productsRoute);
app.use('/products/:id/reviews', reviewRoute);
app.use('/cart', cartRoute);
app.use('/admin', adminRoute);

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/about', (req, res) => {
    res.render('about');
});

app.use((req, res, next) => {
    next(new AppError('Page not found', 404));
});

app.use(globalErrorHandler);

const port = process.env.PORT || 3000;
app.listen(port);