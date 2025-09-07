// fake data - testing purpose , not for production
const Chat = require("../models/chat")
const Message = require("../models/message")
const User = require("../models/user")
const {faker, simpleFaker} = require("@faker-js/faker")

const createSinlgeChats = async(count) =>{
    try {
        const users =  await User.find().select("_id")

        const chatPromise = []

        for(let i=0;i<users.length;i++){
            for (let j= i+1; j< users.length; j++) {
                chatPromise.push(
                    Chat.create({
                        name:faker.lorem.words(2),
                        members : [users[i] , users[j]]
                    })
                )        
            }
        }

        await Promise.all(chatPromise)
        console.log('sample chats created successfully')
        process.exit(1)
    } catch (error) {
        console.log('in single chats seed ',error)
        process.exit(1)
    }
}

const createGroupChats = async(count) =>{
    try {
        const users =  await User.find().select("_id")

        const chatPromise = []

        for (let i = 0; i < chatPromise.length; i++) {
            const numMembers = simpleFaker.number.int({
                min :  3 , max : users.length
            })
            const members = []

            for (let j = 0; j < numMembers.length; j++) {
                const randomIndex = Math.floor(Math.random()*users.length)
                const randomUser = users[randomIndex]

                if(!members.includes(randomUser)){
                    members.push(randomUser)
                }
                
            }

            const chat = Chat.create({
                groupChat : true ,
                name : faker.lorem.words(1),
                members,
                creator : members[0]
            })
            
            chatPromise.push(chat)
        }

        await Promise.all(chatPromise)

        console.log("sample grp chats created ")
        process.exit(1)
    } catch (error) {
        console.log("in group chat seed" , error)
        process.exit(1)
    }
}

const createMessages = async(count)=>{
    try {
        const users =  await User.find().select("_id")
        const chats =  await Chat.find().select("_id")

        const messagePromise = []

        for (let i = 0; i < count; i++) {
            const randomUser  = Math.floor(Math.random()*users.length)
            const randomChat = Math.floor(Math.random()*chats.length)
            
            messagePromise.push(
                Message.create({
                    chat:randomChat,
                    sender:randomUser,
                    content:faker.lorem.sentence()
                })
            )
        }

        await Promise.all(messagePromise)

        console.log("sample messages created successfully")
        process.exit(1)
    } catch (error) {
        console.log("in create message seed" , error)
        process.exit(1)
    }
} 

// similarly for a particular chat

module.exports = {createGroupChats , createSinlgeChats , createMessages} // call in app.js only once 