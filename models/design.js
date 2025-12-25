const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DesignSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    number: {
        type: Number,
        required: true,
        unique: true,
        index: true
    },
    price: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true,
        default: `Create your own beautiful stained glass terrarium with this detailed digital pattern designed for hobbyists and professional glass artists. Perfect for DIY stained glass projects.
        Product Details:
        - Instant digital download (no physical product shipped)
        - Includes 1 PDF blueprint with detailed measurements
        - Includes ZIP file with high-quality JPG images
        Size Information:
        Check the product title to verify if multiple sizes (S, M, L, XL) are available. If no size is indicated, the pattern is provided in one standard dimension.
        Important Notes:
        - This purchase includes a pattern only; no materials or assembly instructions provided.
        - Angle measurements are not included. A protractor can be used to measure the angle or CAD software
        - Ensure you have the appropriate skills to assemble stained glass terrariums. We recommend beginning construction from the bottom for optimal results.
        Delivery:
        The digital files will automatically be sent to your email after checkout. Please confirm your email address is correct when purchasing.`
    }
})


module.exports = mongoose.model('Design', DesignSchema);