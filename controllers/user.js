const CustomAPIError = require('../errors/CustomError')
const User = require('../models/user')
const Request = require('../models/request')
const {cookieOptions, NEW_REQUEST, REFETCH_CHATS} = require("../constants/constants")
const { emitEvent, uploadToCloudinary } = require('../utils/features')
const Chat = require('../models/chat')
const { getOtherMember } = require('../lib/helper')

const createUserToken = async(ID , next) =>{
        try {
            const user = await User.findById(ID)
            console.log('in create token ',user)
            if(!user){
                throw new CustomAPIError("Invalid user id ",404)
            }
            const token = user.generateJWTToken()
            if(!token){
                throw new CustomAPIError("Error while generating user token ",500)
            }
            console.log("in create token , token- ",token)
            user.token = token
            await user.save({validateBeforeSave : false})
            return token 
        } catch (error) {
            next(error)
        }   
}

const registerUser = async(req,res,next)=>{   
  try {
     const {name , userName , userEmail, password , bio } = req.body

    // req.file=image
    
    //  if([name, userName , userEmail , password , bio ].some((field)=>field?.trim()==="")){
    //     throw new CustomAPIError('Please provide all the details',400)
    // }

    // const file = req.file

    // const result = await uploadToCloudinary(file)

    console.log("in register user ",req.file?.path)
    const avatar =  await uploadToCloudinary(req.file?.path)
    console.log('in register user' , avatar)
    //  {
    //     public_id:result.public_id,
    //     url:result.url
    // }

    const user = await User.findOne({
        $or :[ {userName , userEmail} ]
    })

    if(user){
         throw new CustomAPIError('User already exists , please register with unique credentials' , 409)   
    } 

    console.log('after user error')

    const newUser = await User.create({
        userName, userEmail, password ,name , bio , avatar
    })

    const createdUser = await User.findById(newUser._id)

    if(!createdUser){
       throw new CustomAPIError("Something went wrong while registering user")
   }

   const token = await createUserToken(createdUser._id) 

//    const options = {
//     maxAge:15*24*60*60*1000, // 15 days
//     sameSite:"none",
//     httpOnly : true ,
//     secure : true ,
//   }

   return res.status(201)
   .cookie("authToken",token,cookieOptions)
     .json({
        success:true,
         message : 'User registerd successfully' ,
         user:createdUser
     })

  } catch (error) {
    next(error)
  }
}

const loginUser = async(req,res,next)=>{
     try {
        const {userEmail, password} = req.body

        if(!userEmail ) {
            throw new CustomAPIError('Please provide an email ',400) // bad req status code
        }
        if(!password ) {
            throw new CustomAPIError('Please provide the password ',400)  
        }

        const user = await User.findOne({userEmail}).select("+password")
        if(!user){
            throw new CustomAPIError('No such email is registered , please create an account first',404)
        }

        const isPasswordCorrect = await user.comparePassword(password)
        if(!isPasswordCorrect){
            throw new CustomAPIError('Incorrect password',401) 
        }

        const token = await createUserToken(user._id)
        const loggedInUser = await User.findById(user._id)
  
        const options = {
          httpOnly : true ,
          secure : true ,
        }
  
        return res.status(200)
        .cookie("authToken",token,options)
        .json({
             success:true,
             user : loggedInUser ,
             message : 'User logged in successfully'
        })
        
     } catch (error) {
        next(error)
     }
}

const getUserProfile = async(req,res,next)=>{
    try {
        const user = await User.findById(req.user)
        if(!user){
            throw new CustomAPIError("User not found ",404)
        }
        return res.status(200).json({
            success:true,
            user
        })
    } catch (error) {
        next(error)
    }
}

const logout = async(req,res,next)=>{
    try {
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $unset : {
                    token : ""
                }
            },{
                new : true
            }
        )

        return res.status(200)
      .clearCookie("authToken",{
        ...cookieOptions , maxAge:0
      })
      .json({
        success:true,
        message : 'logged out successfully'
      })   
    } catch (error) {
        next(error)
    }
}

const searchUser = async(req,res,next)=>{
    try {
     // all my chats -> all my friends ids -> remaining user ids 
      const {name=""} = req.query

      const myChats=await Chat.find({groupChat : false , members : req.user})
      // me and my chats - friends included
      const allUsersFromMyChats= myChats.map((chat)=>chat.members).flat();  // returns only a single array , combines array within an array in to single array
      const allRemainingUsers = await User.find({
        _id:{$nin : allUsersFromMyChats} , //  not in operator 
        name:{$regex : name , $options :"i"} //pattern matching while searching user , i - case in sensitive
      })

      const users = allRemainingUsers.map(({_id,name,avatar})=>({
        _id,name,
        avatar:avatar.url 
      }))

      return res.status(200).json({
        success:true,
        users
      })
    } catch (error) {
        next(error)
    }
}

const sendFriendRequest = async(req,res,next)=>{
    try {
        const {userId} = req.body

        const request = await Request.findOne({   // requests already exists 
              $or:[
                {sender : req.user , receiver : userId},
                {sender : userId , receiver : req.user},
              ]
        })

        if(request){
            throw new CustomAPIError('Request already exists',400)   
        }

        await Request.create({
            sender:req.user , 
            receiver:userId
        })

        emitEvent(req,NEW_REQUEST,[userId])

        return res.status(200).json({
            success:true ,
            message:"Friend request sent"
        })
    } catch (error) {
        next(error)
    }
}

const acceptFriendRequest = async(req,res,next)=>{
    try {
        const { requestId , accept} = req.body

        const request = await Request.findById(requestId)
                       .populate("sender","name")
                       .populate("receiver","name")

        if(!request){
            throw new CustomAPIError('Request doesnot exists',404)   
        }  
        
        if(request.receiver._id.toString() !== req.user.toString()){
            throw new CustomAPIError('Unauthorised to accept the friend request',401)   
        }

        if(!accept){
            await  request.deleteOne()

            return res.status(200).json({
                success:true ,
                message:"Friend request rejected"
            })
        }

        const members = [request.sender._id , request.receiver._id]
        await Promise.all([
                Chat.create({
                    members, name : `${request.sender.name} - ${request.receiver.name}`
                }),
                request.deleteOne()
            ])
        
        emitEvent(req,REFETCH_CHATS,members)

        return res.status(200).json({
            success:true ,
            message:"Friend request accepted",
            senderId:request.sender._id
        })
    } catch (error) {
        next(error)
    }
}

const getAllNotifications=async(req,res,next)=>{
    try {
        const requests = await Request.find({receiver:req.user}).populate("sender","name avatar")
        if(requests.length<=0){
            return res.status(200).json({
                success:true,
                requests
            })
        }
        const senderUser = await User.findById(requests[0].sender)
        const allRequests = requests.map((request)=>{
            const sender = request.sender
            return ({
               _id: request._id, sender:{
                    _id:sender._id,
                    name:sender.name,
                    avatar:sender.avatar.url
                }
            })
        })
        return res.status(200).json({
            success:true,
            allRequests
        })
    } catch (error) {
        next(error)
    }
}

const getAllFriends=async(req,res,next)=>{
     try {
        const chatId = req.query?.chatId

        const chats = await Chat.find({
            members:req.user , groupChat:false
        }).populate("members","name avatar")

        const friends=chats.map(({members})=>{
             const otherUser = getOtherMember(members,req.user)

             return {
                _id:otherUser._id,
                name:otherUser.name,
                avatar:otherUser.avatar.url
             }
        })

        if(chatId){
            const chat = await Chat.findById(chatId)

            const availableFriends = friends.filter(   // excludes already included friends
                (friend)=> !chat.members.includes(friend._id)
            )
            return res.status(200).json({
                success:true,
                friends : availableFriends
             })
        }else{            
            return res.status(200).json({
               success:true,
               friends
            })
        }
     } catch (error) {
        next(error)
     }
}

module.exports = {registerUser , loginUser , getUserProfile , logout , searchUser , sendFriendRequest , acceptFriendRequest,getAllNotifications , getAllFriends}