const express = require('express');
const router = express.Router();
const passport = require('passport');
const users = require('../controllers/users');
const { validateUser, isNotLoggedin } = require('../middleware');

router.route('/register')
    .get(isNotLoggedin, users.renderRegister)
    .post(isNotLoggedin, validateUser, users.register);

router.route('/login')
    .get(isNotLoggedin, users.renderLogin)
    .post(isNotLoggedin, passport.authenticate('local', { failureFlash: true, failureRedirect: '/login', keepSessionInfo: true }), users.login);

router.get('/logout', users.logout);

router.get('/update', users.update);

module.exports = router;