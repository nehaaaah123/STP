require('dotenv').config({
    path:'./.env'
})
const express = require('express')
const { Server } = require("socket.io")
const { createServer } = require("http")
const { corsOptions, NEW_MESSAGE, START_TYPING, STOP_TYPING, CHAT_JOINED, ONLINE_USERS, CHAT_LEAVED, NEW_MESSAGE_ALERT } = require('./constants/constants.js')

const app=express()
const server = createServer(app)
const io = new Server(server,{
  cors:corsOptions
})

app.set("io",io)  // can access io from req.app.get("io")

const connectDB = require('./db/connect')
const cookieParser = require('cookie-parser')
const {v4} = require("uuid")
const cors = require('cors')

const CustomError = require('./errors/CustomError')
const NotFoundMiddleware = require('./middlewares/NotFound.js')
const ErrorHandlerMiddleware = require('./middlewares/ErrorHandler.js')

const userRoutes = require('./routes/user')
const chatRoutes = require('./routes/chat')
const { getSockets , userSocketIDs , onlineUsers } = require('./lib/helper.js')
const Message = require('./models/message.js')
const { socketAuthenticator } = require('./middlewares/Auth.js')

app.use(cors(corsOptions))
app.use(cookieParser())
app.use(express.json()) // access json data sent in req.body
// app.use(express.urlencoded())

app.use('/api/v1/user',userRoutes)
app.use('/api/v1/chat',chatRoutes)

app.get('/',(req,res)=>{
      res.send('Welcome to chat app')
})

// let userSocketIDs = new Map()  // all members currently connected to socket
// let onlineUsers = new Set() 

io.use((socket , next )=>{
     cookieParser()(socket.request,socket.request.res,
        async (err)=>{  await socketAuthenticator(err , socket , next)
     })
})

io.on("connection",(socket)=>{
    // const user ={  // random for now
    //     _id:"123455",
    //     name:"test"
    // }
    const user = socket.user
   // console.log("user connected ",socket.id)
    userSocketIDs.set(user._id.toString() , socket.id)
  //  console.log("in coonection event emit ",userSocketIDs)

    socket.on(NEW_MESSAGE,async ({chatId , members , message})=>{  // emit emiited from frontend / client , to which server are listening here
       const messageForRealTime = {
        content:message,
        _id:v4(),
        sender : {
            _id : user._id,
            name : user.name
        },
        chat : chatId,
        createdAt: new Date().toISOString()
       }

       const messageForDB = {
        content:message , 
        chat : chatId,
        sender:user._id
       }
        
       const memberSockets = getSockets(members)
       
       io.to(memberSockets).emit(NEW_MESSAGE,{
        message:messageForRealTime,
        chatId
       })// emit emiited from server , to which server will listen

       io.to(memberSockets).emit(NEW_MESSAGE_ALERT,{
        chatId
       })

       await Message.create(messageForDB)
       console.log("New message ",messageForRealTime)
    })

    socket.on(START_TYPING,({members , chatId})=>{
        const memberSockets = getSockets(members)

        socket.to(memberSockets).emit(START_TYPING,{chatId})
    })

    socket.on(STOP_TYPING,({members , chatId})=>{
        const memberSockets = getSockets(members)

        socket.to(memberSockets).emit(STOP_TYPING,{chatId})
    })

   socket.on(CHAT_JOINED,({userId , members})=>{
    onlineUsers.add(userId.toString())
    const memberSockets = getSockets(members)
    console.log("in chat joined backend ")
    io.to(memberSockets).emit(ONLINE_USERS,Array.from(onlineUsers))
   })

   socket.on(CHAT_LEAVED,({userId , members})=>{
    onlineUsers.delete(userId.toString())

    const memberSockets = getSockets(members)

    io.to(memberSockets).emit(ONLINE_USERS,Array.from(onlineUsers))
   })

    socket.on("disconnect",()=>{
        userSocketIDs.delete(user._id.toString())
     //   console.log("user disconnected")
        onlineUsers.delete(user._id.toString())
        socket.broadcast.emit(ONLINE_USERS,Array.from(onlineUsers))  // if a person closes window-then should should offline
    })
})

app.use(ErrorHandlerMiddleware)
app.use(NotFoundMiddleware)

const port = process.env.PORT || 3000
const mongoURI = process.env.MONGO_URI
const envMode = process.env.NODE_ENV.trim() || "PRODUCTION"

const start = async () => {
    try {
        await connectDB(mongoURI)
        console.log('Connected to database')
        server.listen(
            port , ()=>{ console.log(`Server is listening to port - ${port} in ${envMode} mode`)}
        )
      //  console.log(`Server is listening to port - ${port} in ${envMode} mode `)
    } catch (error) {
        console.log('An error occured while connecting to database ', error)
    }
}

// console.log("in app js before export")
// module.exports = { envMode , userSocketIDs }

start()