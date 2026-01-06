const express = require('express');
const router = express.Router();
const User = require('../models/user');
const passport = require('passport');

router.get('/register', (req, res) => {
    res.render('users/register');
})

router.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const registeredUser = await User.register(user, password);
        req.flash('success', 'Welcome');
        res.redirect('/products');
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/register');
    }
})

router.get('/login', (req, res) => {
    if (!req.session.returnTo && req.headers.referer) {
        req.session.returnTo = new URL(req.headers.referer).pathname;
    }
    res.render('users/login');
});

router.post(
    '/login',
    passport.authenticate('local', { failureFlash: true, failureRedirect: '/login', keepSessionInfo: true }), (req, res) => {
        const redirectUrl = req.session.returnTo || '/products';
        delete req.session.returnTo;
        res.redirect(redirectUrl);
    }
);

router.get('/logout', (req, res, next) => {
    const redirectUrl = req.headers.referer || '/products';

    req.logout(function (err) {
        if (err) {
            return next(err)
        }
        req.flash('success', 'Good bye!');
        res.redirect(redirectUrl);
    });
})

module.exports = router;