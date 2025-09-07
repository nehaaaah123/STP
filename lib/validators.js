const { body, validationResult, check , param } = require("express-validator")
const CustomAPIError = require("../errors/CustomError")

const validateHandler = (req, res, next) => {  // this func will be called if above cnds are violated
    try {
        const error = validationResult(req)
        console.log("user validator ", error)

        const errorMessage = error.errors.map((e) => e.msg).join(" , ")

        if (error.isEmpty()) return next()
        else throw new CustomAPIError(errorMessage, 400)
    } catch (error) {
        next(error)
    }
}

const registerValidator = () => [
    // userName , userEmail, password , bio
    // body(["name","userName","password","bio"]).notEmpty(),
    body("name", "Please provide a name").notEmpty(), // field , message - if name not there when what error message will be displayed
    body("userName", "Please provide a userName").notEmpty(),
    body("password", "Please provide a password").notEmpty(),
    body("bio", "Please provide a bio").notEmpty(),
    body("userEmail").notEmpty().isEmail(),
]  // returns array on calling

const loginValidator = () => [
    body("password", "Please provide a password").notEmpty(),
    body("userEmail").notEmpty().isEmail(),
]  

const newGroupChatValidator = () => [
    body("groupName", "Please provide a name").notEmpty(),
    body("members")
    .notEmpty().withMessage("Please provide group members")
    .isArray({min:2 , max:100}).withMessage("Members must be with range of 2-100")
]  

const addMembersValidator = () => [
    body("chatId", "Please provide a chat ID").notEmpty(),
    body("members")
    .notEmpty().withMessage("Please provide group members")
    .isArray({min:1 , max:97}).withMessage("Members must be with range of 1-97")
]

const removeMembersValidator = () => [
    body("chatId", "Please provide a chat ID").notEmpty(),
    body("userId", "Please provide a user ID").notEmpty(),
] 

const chatIdValidator = () => [
    param("id", "Please provide a chat ID").notEmpty(),
] 

const sendAttachmentsValidator = () => [
    body("chatId", "Please provide a chat ID").notEmpty(),
]  

const renameGroupValidator = () => [
    param("id", "Please provide a chat ID").notEmpty(),
    body("name", "Please enter a group name").notEmpty(),
] 

const sendFriendRequestValidator = () => [
    body("userId", "Please enter a user ID").notEmpty(),
]  

const acceptFriendRequestValidator = () => [
    body("requestId", "Please enter a request ID").notEmpty(),
    body("accept")
    .notEmpty().withMessage("Please add accept")
    .isBoolean().withMessage("Accept must be boolean")
]  

module.exports = { 
    registerValidator, loginValidator, validateHandler ,
     newGroupChatValidator  , addMembersValidator , removeMembersValidator,
     chatIdValidator , sendAttachmentsValidator , renameGroupValidator,
     sendFriendRequestValidator , acceptFriendRequestValidator
    }