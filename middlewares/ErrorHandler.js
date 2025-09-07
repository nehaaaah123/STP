const { envMode } = require('../app')
const CustomAPIError = require('../errors/CustomError')

const ErrorHandler = (err,req,res,next)=>{

    if(err.code===11000){
        const error = Object.keys(err.keyPattern).join(" , ")
        err.message = `Duplicate fields - ${error}`,
        err.statusCode = 400
    }

    if(err.name == "CastError"){
        err.message = `Invalid format of - ${err.path}`,
        err.statusCode = 400
    }

    const statusCode = err.statusCode || 500 
    const message = err.message || 'Something went wrong , please try again later'

    const response = {
        success:false,
        message
    }

    if(envMode==="DEVELOPMENT") response.error = err

    return res.status(statusCode).json(response)    
}

module.exports = ErrorHandler