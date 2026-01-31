const User = require('../models/user');
const Order = require('../models/order');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports.renderRegister = (req, res) => {
    res.render('users/register');
}

module.exports.register = async (req, res, next) => {
    try {
        const redirectUrl = req.session.returnTo;

        const { username, password } = req.body.user;
        const user = new User({ username });
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, (err) => {
            if (err) return next(err);
            req.flash('success', 'Welcome');
            res.redirect(redirectUrl);
        })
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/register');
    }
}

module.exports.renderLogin = (req, res) => {
    res.render('users/login');
}

module.exports.login = (req, res) => {
    req.flash('success', 'Welcome Back!');
    const redirectUrl = req.session.returnTo;

    delete req.session.returnTo;

    res.redirect(redirectUrl);
}

module.exports.logout = (req, res) => {
    const redirectUrl = req.session.returnTo;

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
        const redirectUrl = req.session.returnTo;

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
        return res.redirect(redirectUrl);
    } catch (e) {
        next(e);
    }
};

module.exports.orderHistory = async (req, res, next) => {
    try {
        const orders = await Order.find({ user: req.user._id });

        const session = event.data.object;

        const paymentIntentId = session.payment_intent;

        const pi = await Stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['charges.data.payment_method_details']
        });

        const last4 = pi.charges.data[0].payment_method_details.card.last4;

        res.render('orders/orderHistory', { orders, last4 });
    } catch (err) {
        next(err)
    }
}