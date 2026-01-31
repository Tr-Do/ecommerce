const express = require('express');
const router = express.Router();
const passport = require('passport');
const users = require('../controllers/users');
const { validateUser, requireGuest, requireLogin, previousPage } = require('../middleware');

router.route('/register')
    .get(previousPage, requireGuest, users.renderRegister)
    .post(requireGuest, validateUser, users.register);

router.route('/login')
    .get(previousPage, requireGuest, users.renderLogin)
    .post(passport.authenticate('local', { failureFlash: true, failureRedirect: '/login', keepSessionInfo: true }),
        users.login);

router.get('/logout', previousPage, users.logout);

router.route('/update')
    .get(previousPage, requireLogin, users.renderUpdate)
    .post(requireLogin, users.update);

router.get('/orderhistory', previousPage, requireLogin, users.orderHistory)

module.exports = router;