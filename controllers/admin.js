const Order = require('../models/order');
const User = require('../models/user');
const { AppError } = require('../utils/AppError');

module.exports.orderOverview = async (req, res) => {
    const orders = await Order.find();
    res.render('orders/orderOverview', { orders });
}

module.exports.orderDetail = async (req, res) => {
    const { orderNumber } = req.params;
    const order = await Order.findOne({ orderNumber });

    res.render('orders/orderDetail', { order })
}

module.exports.userOverview = async (req, res) => {
    const users = await User.find({ role: { $ne: 'admin' } });
    res.render('users/userOverview', { users });
}

module.exports.dashboard = async (req, res) => {
    res.render('users/dashboard');
}

module.exports.userAction = async (req, res, next) => {
    try {
        const { action } = req.body;
        const { userId } = req.params;

        if (!action) throw new AppError('No action selected', 400);

        if (action === 'reset') {
            const user = await User.findById(userId);
            await user.setPassword('123456');
            await user.save();

            req.flash('success', 'Password reset');
            res.redirect('/admin/userOverview');
        }

        if (action === 'delete') {
            const { userId } = req.params;
            await User.findByIdAndDelete(userId);

            req.flash('success', 'Delete user successfully!')
            res.redirect('/admin/userOverview');
        }
    } catch (err) {
        next(err);
    }
}
