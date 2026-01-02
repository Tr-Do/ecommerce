class AppError extends Error {
    constructor(message, status) {
        super();
        this.message = message;
        this.status = status;
    }
}
const throwError = (product) => {
    if (!product) {
        throw new AppError("Product not found", 404);
    }
}

module.exports = { AppError, throwError };