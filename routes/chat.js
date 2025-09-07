const express = require('express')
const router = express.Router();
const {
    newGroupChat , getMyChats, getMyGroups , addMembers, 
    removeMember, leaveGroup, sendAttachments, getChatDetails
    , renameGroup, deleteChat,
    getMessages} = require('../controllers/chat')
const {verifyUser} = require('../middlewares/Auth');
const { attachmentsMulter, upload } = require('../utils/multer');
const { newGroupChatValidator, validateHandler, addMembersValidator, removeMembersValidator, chatIdValidator, sendAttachmentsValidator, chatIdValidatorntsValidator, renameGroupValidator } = require('../lib/validators');

router.use(verifyUser) // all the furrther routes must be authenticated

router.post("/new",newGroupChatValidator(),validateHandler,newGroupChat)
router.get("/my-chats",getMyChats);
router.get("/my-groups",getMyGroups);
router.put("/add-members",addMembersValidator(),validateHandler,addMembers)
router.put("/remove-member",removeMembersValidator(),validateHandler,removeMember)
router.delete("/leave-group/:id",chatIdValidator(),validateHandler,leaveGroup)
router.post("/message",attachmentsMulter,sendAttachmentsValidator(),validateHandler,sendAttachments)
router.get("/message/:id",chatIdValidator(),validateHandler,getMessages)
router.route("/:id")
.get(chatIdValidator(),validateHandler,getChatDetails)
.put(renameGroupValidator(),validateHandler,renameGroup)
.delete(chatIdValidator(),validateHandler,deleteChat)

module.exports = router
