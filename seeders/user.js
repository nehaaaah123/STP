// fake data - testing purpose , not for production
const Chat = require("../models/chat")
const Message = require("../models/message")
const User = require("../models/user")
const {faker, simpleFaker} = require("@faker-js/faker")

const createUser = async(numUsers)=>{
    try {
        const userPromise=[]

        for(let i=0; i<numUsers; i++){
            const tempUser = User.create({
               name : faker.person.fullName(),
               userName:faker.internet.username(),
               userEmail : faker.internet.email(),
               password:"password",
               bio : faker.lorem.sentence(10),
               avatar : {
                url:faker.image.avatar(),
                public_id : faker.system.fileName()
               }
            })

            userPromise.push(tempUser)
        }
        await Promise.all(userPromise)
        console.log('in seed user , users created')
        process.exit(1)
    } catch (error) {
        console.log('in user seed ',error)
        process.exit(1)
    }
}

module.exports = {createUser } // call in app.js only once 