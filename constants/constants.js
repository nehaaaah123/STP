const cookieOptions = {
    maxAge:15*24*60*60*1000, // 15 days
    sameSite:"none",
    httpOnly : true ,
    secure : true ,
  }

  const corsOptions ={
    origin : process.env.CORS_ORIGIN,  // can pass array -[]
    credentials : true ,
    methods:["GET","PUT","POST","DELETE"]
}

const  NEW_MESSAGE = "NEW_MESSAGE"
const  NEW_MESSAGE_ALERT = "NEW_MESSAGE_ALERT"
const START_TYPING = "START_TYPING"
const STOP_TYPING = "STOP_TYPING"
const CHAT_LEAVED = "CHAT_LEAVED"
const CHAT_JOINED = "CHAT_JOINED"
const ONLINE_USERS = "ONLINE_USERS"
const REFETCH_CHATS = "REFETCH_CHATS"
const NEW_REQUEST = "NEW_REQUEST"
const ALERT = "ALERT"

  module.exports = {
    cookieOptions , corsOptions ,
    NEW_MESSAGE , START_TYPING, STOP_TYPING , CHAT_JOINED , CHAT_LEAVED , ONLINE_USERS ,NEW_MESSAGE_ALERT , REFETCH_CHATS , NEW_REQUEST , ALERT
  }