const CustomAPIError = require('../errors/CustomError')
const User = require('../models/user')
const jwt =require("jsonwebtoken")

const verifyUser = async(req,res,next)=>{
    try {
     //   console.log('in verify user ',req.cookies)
        const token = req.cookies?.authToken

        if(!token){
            throw new CustomAPIError("Please login first to access this route" , 401);
        }

        const decodedToken = jwt.verify(token,process.env.JWT_SECRET)

        const user = await User.findById(decodedToken?.ID)
        if(!user){
            throw new CustomAPIError("No user found with given token" , 401);
        }
        req.user = user._id
        next()
        
    } catch (error) {
        next(error)
    }
}

const socketAuthenticator =async (err,socket,next)=>{
    try {
        if(err) return next(err)
        
      //  console.log("in socketAuthenticator ",socket.handshake.headers.cookie.split('=')[1])
        const authToken = socket.handshake.headers.cookie.split('=')[1]
        if(!authToken){
            throw new CustomAPIError("Please login first to access this route" , 401);
        }

        const decodedToken = jwt.verify(authToken,process.env.JWT_SECRET)
        if(!decodedToken){
            throw new CustomAPIError("Invalid token" , 401);
        }
   //     console.log("in socket authenticator after decoded token ",decodedToken)
        const user = await User.findById(decodedToken?.ID)
        if(!user){
            throw new CustomAPIError("No user found with given token" , 401);
        }
        
        socket.user = user
       // console.log("in socketAuthenticator socket ",socket.user)
         next()
    } catch (error) {
        // throw new CustomAPIError("Please login first to access this route" , 401);
        next(error)
    }
}

module.exports = {verifyUser , socketAuthenticator} 