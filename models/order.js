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
            trim: true,
            lowercase: true,
            required: function () {
                return this.payment?.status === 'paid' && this.payment?.provider === 'stripe';
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
                    required: true,
                    min: 0
                },
                filesSnapshot: [{
                    bucket: String,
                    key: String,
                    originalName: String,
                    contentType: String,
                    size: Number
                }],
            }
        ],
        payment: {
            provider: {
                type: String,
                enum: ['stripe', 'paypal'],
                default: 'stripe'
            },
            status: {
                type: String,
                enum: ['pending', 'paid', 'failed', 'refunded'],
                default: 'pending'
            },
            amountCharged: {            // amount in cents
                type: Number,
                default: null,
                min: 0
            },
            currency: {
                type: String,
                lowercase: true,
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
                brand: {
                    type: String,
                    default: null
                },
                last4: {
                    type: String,
                    default: null
                }
            },
            paidAt: {
                type: Date,
                default: null
            },
            amountTotal: {          // amount in cents
                type: Number,
                required: true,
                min: 0
            },
            emailSentAt: {
                type: Date,
                default: null
            },
            paypalOrderId: {
                type: String, default: null,
                unique: true,
                sparse: true
            },
            paypalCaptureId: {
                type: String,
                default: null,
                unique: true,
                sparse: true
            },
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);