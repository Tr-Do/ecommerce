const Joi = require('joi');

module.exports.productSchema = Joi.object({
    product: Joi.object({
        name: Joi.string().required(),
        price: Joi.number().required().min(0),
        description: Joi.string().required(),
        image: Joi.string().allow('').optional(),
        size: Joi.array().items(Joi.string().valid('S', 'M', 'L', 'XL')).optional()
    }).required(),
    deleteImages: Joi.array(),
})