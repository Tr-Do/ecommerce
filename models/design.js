const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DesignSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    image: {
        type: String,
    },
    description: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model('Design', DesignSchema);