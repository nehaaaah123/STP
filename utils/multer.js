const multer = require('multer')
//const { CloudinaryStorage} = require('multer-storage-cloudinary')
const cloudinary = require('./cloudinary')

// const storage = new CloudinaryStorage({
//     cloudinary : cloudinary,
//     params : {
//         folder : 'chat_app',
        
//     }
// })
const storage = multer.diskStorage({}) //directlyy using cloudinary 

const upload = multer({
    storage:storage,
    limits:{
        fileSize:1024*1024* 5 // 5mb
    },
})

const attachmentsMulter = upload.array("files",5) // max 5 files 

module.exports =  {upload , attachmentsMulter}