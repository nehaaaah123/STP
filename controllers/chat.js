const CustomAPIError = require("../errors/CustomError")
const Chat = require("../models/chat")
const {emitEvent, deleteFilesFromCloudinary, uploadToCloudinary} = require("../utils/features")
const {getOtherMember} = require("../lib/helper")
const User = require("../models/user")
const Message = require("../models/message")
const { NEW_MESSAGE, NEW_MESSAGE_ALERT, REFETCH_CHATS, ALERT } = require("../constants/constants")

const newGroupChat = async(req,res,next)=>{
    try {
        const {groupName , members} = req.body // members have user ids

        if(members.length<2) {
            throw new CustomAPIError("A group must have atleast 3 members" , 400)
        }

        const allMembers = [...members , req.user]
        console.log("in newGroupChat",allMembers)
        await Chat.create({
            name : groupName,
            groupChat: true , 
            creator : req.user,
            members : allMembers
        })

        emitEvent(req,ALERT,allMembers,`Welcome to ${groupName} group`)
        emitEvent(req,REFETCH_CHATS,members,``)

        return res.status(201).json({
            success:true ,
            message : "Group created successfully"
        })
    } catch (error) {
        next(error)
    }
}

const getMyChats = async(req,res,next)=>{
 try {
    const chats = await Chat.find({members : req.user}).populate( "members")

   // console.log("in get my chats ",chats)
    const transformedChats = chats.map(({_id,name , members,groupChat })=>{
        const otherMember = getOtherMember(members,req.user)
        let avatarArray
       if(groupChat) {
         avatarArray = members.slice(0,3).map((data)=>data.avatar.url)
       // console.log("inside func ",avatarArray)
       }
        return {
            _id,groupChat ,
            avatar : groupChat ? (
                avatarArray
            ):(
                [otherMember.avatar.url]
            ),
            name : groupChat?name : otherMember.name,
            members:members.reduce((prev,curr)=>{
                if(curr._id.toString()!== req.user.toString()){
                    prev.push(curr._id)
                }
                return prev;
            },[]) // in members array we want only id of each member , empty array- initial state
        }
    }) 

    //console.log("in get my transformed chats ",transformedChats)
    return res.status(200).json({
        success:true , 
        chats : transformedChats
    })
 } catch (error) {
    next(error)
 }
}

const getMyGroups = async(req,res,next)=>{
    try {
        const groups = await Chat.find({
            members:req.user ,
            groupChat:true,
            creator : req.user
        }).populate("members","name avatar")

        const transformedGroups = groups.map(({_id,name,groupChat,members})=>({
            _id,name,groupChat,
            avatar:members.slice(0,3).map(({avatar})=>avatar.url)
        }))

        return res.status(200).json({
            success : true ,
            groups:transformedGroups
        })
    } catch (error) {
        next(error)
    }
}

const addMembers = async(req,res,next)=>{
    try {
        const {chatId , members} = req.body
        const chat = await Chat.findById(chatId)

        if(!chat){
            throw new CustomAPIError("No chat found",404)
        }
        if(!chat.groupChat){
            throw new CustomAPIError("Not a group chat found",400)
        }

        if(chat.creator.toString() !== req.user.toString()) {
            throw new CustomAPIError("You are not allowed to add members",403)
        }

        if(!members || members.length<1){
            throw new CustomAPIError("Please provide members",400)
        }
        const allMembersPromise = members.map((member)=>User.findById(member,"name")) //fetch only name of user

        const allMembers = await Promise.all(allMembersPromise)

        const uniqueMembers = allMembers.filter((member)=>!chat.members.includes(member._id.toString())) // only unqiue members will be added

        chat.members.push(...uniqueMembers.map((i)=>i._id))

        if(chat.members.length>100){
            throw new CustomAPIError("Group members limit reached , can't add new members",400)
        }

        await chat.save()

        const allUsersName = uniqueMembers.map((member)=>member.name).join(",") // array to string of anmes sep by comma

        emitEvent(req ,ALERT,chat.members,`${allUsersName} have been added to ${chat.name} by ${req.user.name}`)
        emitEvent(req,REFETCH_CHATS,chat.members)

        return res.status(200).json({
            success:true,
            message:"Members added successfully"
        })
    } catch (error) {
        next(error)
    }
}

const removeMember= async(req,res,next)=>{
    try {
        const {userId , chatId}= req.body

        const chat =  await Chat.findById(chatId)
        const user = await User.findById(userId,"name")

        if(!chat){
            throw new CustomAPIError("No chat found",404)
        }
        if(!chat.groupChat){
            throw new CustomAPIError("Not a group chat found",400)
        }
        if(chat.creator.toString() !== req.user.toString()) {
            throw new CustomAPIError("You are not allowed to delete members",403)
        }
        if(chat.members.length<=3){
            throw new CustomAPIError("Group must have atleast 3 members",400)
        }
         
        const allMembers = chat.members.map((member)=>member.toString())
        chat.members = chat.members.filter((member)=>member._id.toString() !== userId.toString()) 
        await chat.save()

        emitEvent(req,ALERT,chat.members,{
            message:`${user.name} is no longer part of the group , is removed`,
            chatId
        })
        emitEvent(req,REFETCH_CHATS,allMembers)

        return res.status(200).json({
            success:true ,
            message:"Member have been successfully removed"
        })
    } catch (error) {
        next(error)
    }
}

const leaveGroup = async(req,res,next)=>{
    try {
        const chatId = req.params.id
        
        const chat = await Chat.findById(chatId)

        if(!chat){
            throw new CustomAPIError("No chat found",404)
        }
        if(!chat.groupChat){
            throw new CustomAPIError("Not a group chat found",400)
        }

        const remainingMembers = chat.members.filter((member)=>member._id.toString() !== req.user.toString())

        if(remainingMembers.length<3){
            throw new CustomAPIError("Group must have atleast 3 members",400)
        }

        if(chat.creator.toString() === req.user.toString() ){
            const randomElement = Math.floor(Math.random()*remainingMembers.length)
            const newCreator = remainingMembers[randomElement]

            chat.creator = newCreator
            
        }

        chat.members = remainingMembers
        const [user] = await Promise.all([User.findById(req.user,"name") , chat.save()])

        emitEvent(req,'alert',chat.members,{
            message:`${user} has left the group `,
            chatId
        })
       

        return res.status(200).json({
            success:true ,
            message:"Group left successfully"
        })

    } catch (error) {
        next(error)
    }
}

const sendAttachments = async(req,res,next)=>{
    try {
        console.log("in send attachemnts ",req.body)
        const {chatId }= req.body

        const files = req.files || []

        if(files.length<1){
            throw new CustomAPIError("Please provide atachments",400)
        }

        if(files.length>5){
            throw new CustomAPIError("Attachments should not be more than 5",400)
        }

        const [chat , user] = await Promise.all([
            Chat.findById(chatId),
            User.findById(req.user,"name"),
        ])

        if(!chat){
            throw new CustomAPIError("No chat found",404)
        }
          
        const attachments = await Promise.all(files.map(file => uploadToCloudinary(file)));

        const messageForRealTime ={
            content : "" , attachments ,
             sender : {
                _id: user._id,
                name : user.name,
             },
              chat : chatId
        }

        const messageForDB ={ content : "" , attachments , sender : user._id , chat : chatId}

        const message = await Message.create(messageForDB)

        emitEvent(req,NEW_MESSAGE,chat.members,{
            message:messageForRealTime,
            chatId
        })
        emitEvent(req,NEW_MESSAGE_ALERT,chat.members,{chatId})

        return res.status(200).json({
            success:true,
            message
        })
    } catch (error) {
        next(error)
    }
}

const getChatDetails = async(req,res,next)=>{
    try {
        console.log("in chat details",req.query)
        if(req.query.populate === 'true'){  //id?populate=true
           const chatId = req.params.id
           const chat = await Chat.findById(chatId).populate("members","name avatar").lean() // chat becomes now an js object , now an db obj

           if(!chat){
            throw new CustomAPIError("No chat found",404)
        }
        
        chat.members = chat.members.map(({_id,name,avatar})=>({
            _id,name,
            avatar : avatar.url
        }))
        console.log("in get chat details ",chat)
        return res.status(200).json({
            success:true,
            chat
        })
        }else{
          //  console.log("in get chat details , populate - false before chat ",req.params)
            const chatId = req.params.id
            const chat = await Chat.findById(chatId)

           // console.log("in get chat details , populate - false",chat)
 
            if(!chat){
             throw new CustomAPIError("No chat found",404)
            }

         return res.status(200).json({
             success:true,
             chat
         })
        }
    } catch (error) {
        next(error)
    }
}

const renameGroup = async(req,res,next)=>{
    try {
        const chatId = req.params.id
        const {name} = req.body

        const chat = await Chat.findById(chatId)

        if(!chat){
            throw new CustomAPIError("No chat found",404)
        }

        if(!chat.groupChat){
            throw new CustomAPIError("This is not a group chat , you can't rename it's name ",400)
        }

        if(chat.creator.toString() !== req.user.toString()){
            throw new CustomAPIError("You are not allowed to change the name of the group",403)
        }

        chat.name = name 
        await chat.save()

        emitEvent(req,REFETCH_CHATS,chat.members)

        return res.status(200).json({
            success:true,
            message:"Group renamed successfully"
        })
    } catch (error) {
        next(error)
    }
}

const deleteChat = async(req,res,next)=>{
    try {
        const chatId = req.params.id

        console.log("in delete chat ",req.params)
        const chat = await Chat.findById(chatId)

        if(!chat){
            throw new CustomAPIError("No chat found",404)
        }

        if(chat.groupChat && chat.creator.toString() !== req.user.toString()){
            throw new CustomAPIError("You are not allowed to delete the group",403)
        }

        if(!chat.groupChat && !chat.members.includes(req.user.toString())){
            throw new CustomAPIError("You are not allowed to delete the group",403)
        }

        const members = chat.members

        const messageWithAttachments = await Message.find({
            chat : chatId,
            attachments : {
                $exists : true ,
                $ne : [],
            }
        })

        const public_ids = []

        messageWithAttachments.forEach(({attachments})=>{
            attachments.forEach(({public_id})=>public_ids.push(public_id))
        })

        await Promise.all([
            deleteFilesFromCloudinary(public_ids),
            chat.deleteOne(),
            Message.deleteMany({chat:chatId})
        ])

        emitEvent(req,REFETCH_CHATS,members)

        return res.status(200).json({
            success:true,
            message:"Chat deleted successfully"
        })
    } catch (error) {
        next(error)
    }
}

const getMessages = async(req,res,next)=>{
    try {
        const chatId = req.params.id
        const {page = 1} = req.query
        const limit = 20 // per page limit 

        const skip = (page-1) * limit

        const chat = await Chat.findById(chatId)

        if(!chat){
            throw new CustomAPIError("No chat found",404)
        }
        if(!chat.members.includes(req.user.toString())){
            throw new CustomAPIError("You are not authorised to access this chat ",403)   
        }

        const [messages,totalMessageCount] = await Promise.all([
        Message.find({chat:chatId})
        .sort({creatadAt : -1}) // descending order of message created 
        .skip(skip)
        .limit(limit)
        .populate("sender","name")
        .lean(),

        Message.countDocuments({chat:chatId})
        ])

        const totalPages = Math.ceil(totalMessageCount/limit) || 0

        return res.status(200).json({
            success:true , 
            messages:messages.reverse(),
            totalPages
        })
    } catch (error) {
        next(error)
    }
}

module.exports = {
    newGroupChat , 
    getMyChats ,
    getMyGroups ,
    addMembers,
    removeMember ,
    leaveGroup ,
    sendAttachments ,
    getChatDetails,
    renameGroup,
    deleteChat,
    getMessages
}