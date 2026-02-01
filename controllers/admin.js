const Order = require('../models/order');

module.exports.orderView = async (req, res) => {
    const orders = await Order.find({});
    res.render('orders/orderView', { orders });
}

module.exports.orderDetail = async (req, res) => {
    const { orderNumber } = req.params;
    const order = await Order.findOne({ orderNumber });

    res.render('orders/orderDetail', { order })
}