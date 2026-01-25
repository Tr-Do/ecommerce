const BaseJoi = require('joi');
const sanitizeHtml = require('sanitize-html');

const extension = (joi) => ({
    type: 'string',
    base: joi.string(),
    messages: {
        'string.escapeHTML': '{{#label}} must not include HTML!'
    },
    rules: {
        escapeHTML: {
            validate(value, helpers) {
                const clean = sanitizeHtml(value, {
                    allowedTags: [],
                    allowedAttributes: {},
                });
                if (clean !== value) return helpers.error('string.escapeHTML', { value })
                return clean;
            }
        }
    }
});

const Joi = BaseJoi.extend(extension);

// validation and prevent XSS with Joi
module.exports.productSchema = Joi.object({
    product: Joi.object({
        name: Joi.string().required().escapeHTML(),
        price: Joi.number().required().min(0),
        description: Joi.string().required().escapeHTML(),
        image: Joi.string().allow('').optional(),
        imageOrder: Joi.string().allow('').optional(),
        size: Joi.array().items(Joi.string().valid('S', 'M', 'L', 'XL')).optional()
    }).required(),
    deleteImages: Joi.array(),
})

module.exports.userSchema = Joi.object({
    user: Joi.object({
        username: Joi.string().required().min(4).escapeHTML(),
        password: Joi.string().required().min(6).max(20)
    }).required(),
    'cf-turnstile-response': Joi.string().required()
})

module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        rating: Joi.number().required().min(1).max(5),
        body: Joi.string().required()
    }).required(),
    'cf-turnstile-response': Joi.string().required()
})