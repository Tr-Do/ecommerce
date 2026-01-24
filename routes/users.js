const express = require('express');
const router = express.Router();
const passport = require('passport');
const users = require('../controllers/users');
const { validateUser, requireGuest, requireLogin, previousPage } = require('../middleware');

router.route('/register')
    .get(requireGuest, users.renderRegister)
    .post(requireGuest, validateUser, users.register);

router.route('/login')
    .get(previousPage, requireGuest, users.renderLogin)
    .post(passport.authenticate('local', { failureFlash: true, failureRedirect: '/login', keepSessionInfo: true }),
        users.login);

router.get('/logout', users.logout);

router.route('/update')
    .get(requireLogin, users.renderUpdate)
    .post(requireLogin, users.update);

module.exports = router;