const Order = require('../models/order');

module.exports.renderView = async (req, res) => {
    const orders = await Order.find({});
    res.render('orders/adminView', { orders });
}

module.exports.orderDetail = async (req, res) => {
    const { orderNumber } = req.params;
    const order = await Order.findOne({ orderNumber });

    res.render('orders/orderDetail', { order })
}