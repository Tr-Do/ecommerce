const Order = require('../models/order');
const User = require('../models/user');

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
    const users = await User.find();
    res.render('users/userOverview', { users });
}