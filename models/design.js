const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const imageSchema = new Schema({
    url: String,
    filename: String
})

imageSchema.virtual('editThumbnail').get(function () {
    return this.url.replace('/upload', '/upload/f_auto,q_auto,c_fit,w_200,h_200')
});

imageSchema.virtual('homepageThumbnail').get(function () {
    return this.url.replace('/upload', '/upload/f_auto,q_auto,c_fit,h_300,w_450')
});

imageSchema.virtual('showPage').get(function () {
    return this.url.replace('/upload', '/upload/f_auto,q_auto,c_fit,h_700,w_700');
});

const DesignSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    images: [imageSchema],
    description: {
        type: String,
        required: true
    },
    size: {
        type: [String],
        default: []
    }
})

module.exports = mongoose.model('Design', DesignSchema);