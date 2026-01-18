const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema(
    {
        stripeSessionId: {
            type: String,
            required: true,
            unique: true
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        items: [
            {
                productId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Design',
                    required: true
                },
                size: {
                    type: String,
                    require: true
                },
                price: {
                    type: Number,
                    required: true
                }
            }
        ],
        amountTotal: {
            type: Number,
            required: true
        },
        paid: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.Model('Order', orderSchema);