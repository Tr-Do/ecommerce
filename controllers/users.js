const User = require('../models/user');

module.exports.renderRegister = async (req, res) => {
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
}

module.exports.renderLogin = (req, res) => {
    if (!req.session.returnTo && req.headers.referer) {
        req.session.returnTo = new URL(req.headers.referer).pathname;
    }
    res.render('users/login');
}

module.exports.login = (req, res) => {
    req.flash('success', 'Welcome back');
    const redirectUrl = req.session.returnTo || '/products';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
}

module.exports.logout = (req, res, next) => {
    const redirectUrl = req.headers.referer || '/products';
    req.logout(function (err) {
        if (err) {
            return next(err)
        }
        req.flash('success', 'Good bye!');
        res.redirect(redirectUrl);
    });
}