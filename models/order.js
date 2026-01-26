const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

const orderSchema = new Schema(
    {
        orderNumber: {
            type: String,
            unique: true,
            default: () => `ORD-${nanoid()}`        // create readable order #
        },
        stripeSessionId: {
            type: String,
            required: true,
            unique: true
        },
        ip: {
            type: String,
            required: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        email: {
            type: String,
            required: function () {
                return this.paid === true;
            },
            default: null
        },
        items: [
            {
                productId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Design',
                    required: true
                },
                name: {
                    type: String,
                    required: true
                },
                image: { type: String },
                size: {
                    type: String,
                    required: true
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
        },
        emailSentAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Order', orderSchema);