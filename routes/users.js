const express = require('express');
const router = express.Router();
const User = require('../models/user');
const passport = require('passport');
const users = require('../controllers/users');

router.get('/register', (req, res) => {
    res.render('users/register');
})

router.post('/register', users.renderRegister);

router.get('/login', users.renderLogin);

router.post(
    '/login',
    passport.authenticate('local', { failureFlash: true, failureRedirect: '/login', keepSessionInfo: true }), users.login);

router.get('/logout', users.logout);

module.exports = router;