require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/order');

(async () => {
    await mongoose.connect(process.env.DB_URL);

    await Order.collection.dropIndex('payment.stripeSessionId_1');
    console.log('Dropped payment.stripeSessionId_1');

    process.exit(0);
})();
