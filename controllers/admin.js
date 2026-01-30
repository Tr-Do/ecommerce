const Order = require('../models/order');

module.exports.renderView = async (req, res) => {
    const orders = await Order.find({});
    res.render('orders/adminView', { orders });
}