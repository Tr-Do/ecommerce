const User = require('../models/user');

module.exports.renderRegister = (req, res) => {
    res.render('users/register');
}

module.exports.register = async (req, res, next) => {
    try {
        const { username, password } = req.body.user;
        const user = new User({ username });
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, (err) => {
            if (err) return next(err);
            req.flash('success', 'Welcome');
            res.redirect('/products');
        })
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
    req.flash('success', 'Welcome Back');
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
        req.flash('success', 'Good Bye!');
        res.redirect(redirectUrl);
    });
}

module.exports.renderUpdate = (req, res) => {
    res.render('users/update');
}

module.exports.update = async (req, res, next) => {
    try {
        const { password, confirmPassword } = req.body;

        if (!password || password.length < 6 || password.length > 20) {
            req.flash('error', 'Invalid password');
            return res.redirect('/update');
        }

        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match')
            return res.redirect('/update');
        }

        const user = req.user;
        await user.setPassword(password);
        await user.save();

        req.flash('success', 'Update password successfully!');
        return res.redirect('/');
    } catch (e) {
        next(e);
    }
};