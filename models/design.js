const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DesignSchema = new Schema({
    title: String,
    price: String,
    description: String,
})

module.export = mongoose.model('Design', DesignSchema);