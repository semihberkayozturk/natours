const AppError = require("../utils/appError")

const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}`
    return new AppError(message, 400)
}

const handleDuplicateFieldsDB = err => {
    const value = Object.values(err.keyValue)[0];
    const message = `Duplicate field value: ${value}. Please use another value'!`
    return new AppError(message, 400);
}

const handleValidationErrorDB = err => {
    const message = `Invalid input data: ${err._message}`;
    return new AppError(message, 400)
}

const handleJwtError = () => new AppError("Invalid token! Please log in again", 401)

const handleJwtExpiredError = () => new AppError("Your token has expired! Please log in again!", 401)

const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    })
};

const sendErrorProd = (err, res) => {
    //operational, trusted error: send message to the client
    if (err.isOperational) {
        res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            })
            //programming or other unknown error: don't leak error details!
    } else {
        //log the error
        console.error("ERROR", err)

        //send generic message
        res.status(500).json({
            status: "error",
            message: "Something went wrong!"
        })
    }
};


module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res)
    } else if (process.env.NODE_ENV === 'production') {
        let error = {...err };
        if (error.name === "CastError") error = handleCastErrorDB(error)
        if (error.code === 11000) error = handleDuplicateFieldsDB(error)
        if (error._message === "Validation failed") error = handleValidationErrorDB(error)
        if (error.name === "JsonWebTokenError") error = handleJwtError()
        if (error.name === "TokenExpiredError") error = handleJwtExpiredError()

        sendErrorProd(error, res)
    }
};