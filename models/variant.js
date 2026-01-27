const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const fileSchema = new Schema({
    bucket: {
        type: String,
        required: true
    },
    key: {
        type: String,
        required: true
    },
    originalName: String,
    contentType: {
        type: String,
        required: true
    },
    size: Number
}, { _id: false });

const variantSchema = new Schema({
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Design',
        required: true,
        index: true
    },
    size: {
        type: String,
        enum: ['Standard', 'S', 'M', 'L', 'XL'],
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    files: {
        type: [fileSchema],
        default: []
    }
},
    { timestamps: true });

variantSchema.index({ productId: 1, size: 1 }, { unique: true });
module.exports = mongoose.model('Variant', variantSchema);