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
                return this.payment?.status === true;
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
                variantId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Variant',
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
                },
                filesSnapshot: [{
                    bucket: String,
                    key: String,
                    originalName: String,
                    contentType: String,
                    size: Number
                }]
            }
        ],
        payment: {
            provider: {
                type: String,
                default: 'stripe'
            },
            status: {
                type: String,
                enum: ['pending', 'paid', 'failed', 'refunded'],
                default: 'pending'
            },
            amountCharged: Number,
            currency: {
                type: String,
                default: 'usd',
            },
            stripeSessionId: {
                type: String,
                default: null,
                required: function () {
                    return this.payment?.provider === 'stripe';
                },
                unique: true,
                sparse: true    //ignore the value if null
            },
            paymentIntentId: {
                type: String,
                default: null
            },
            card: {
                brand: String,
                last4: String
            },
            paidAt: {
                type: Date,
                default: null
            },
            amountTotal: {
                type: Number,
                required: true
            },
            emailSentAt: {
                type: Date,
                default: null
            }
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);