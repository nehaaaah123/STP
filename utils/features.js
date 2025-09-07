 const CustomAPIError = require('../errors/CustomError')
const { getSockets } = require('../lib/helper')
const cloudinary = require('./cloudinary')
const {v4 } = require("uuid")

const emitEvent = (req,event,users,data)=>{
        console.log("in emit event",users , data)
        const io = req.app.get("io")
        const userSockets = getSockets(users)
        io.to(userSockets).emit(event,data)
        console.log("emitting event " , event)
}

const uploadToCloudinary = async(file)=>{
       try {
        if(!file){
              throw new CustomAPIError("Please upload an avatar",400)
        }
        console.log('in upload to cloudinary before ',file)
        const result = await cloudinary.uploader.upload(file.path,{
                resource_type:"auto",
                public_id:v4()
        })
        console.log('in upload to cloudinary ',result)
        const avatar =  {
         public_id : result.public_id,
         url:result.secure_url
        }   
        console.log("avatar after uploading ",avatar)
        return avatar;
       }
          
       catch (error) {
        console.log("in cloudinary upload ",error)
        throw new CustomAPIError("Failed to upload avatar in cloudinary",400)
       }
}

// const deleteFilesFromCloudinary = async(public_ids)=>{

// }

module.exports = {emitEvent , uploadToCloudinary}