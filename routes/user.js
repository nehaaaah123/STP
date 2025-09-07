const express = require('express')
const router = express.Router();
const {upload} = require('../utils/multer')
const {registerUser , loginUser , getUserProfile , logout , searchUser, sendFriendRequest, acceptFriendRequest, getAllNotifications, getAllFriends} = require('../controllers/user')
const {verifyUser} = require('../middlewares/Auth');
const { registerValidator, validateHandler, loginValidator, sendFriendRequestValidator, acceptFriendRequestValidator } = require('../lib/validators');

// upload.single('avatar')
router.post('/register',upload.single("avatar"), registerValidator() ,validateHandler,registerUser)
router.post('/login',loginValidator(),validateHandler,loginUser)

router.use(verifyUser) // all the furrther routes must be authenticated
router.get('/my-profile',getUserProfile)
router.get('/logout',logout)
router.get('/search-user',searchUser)
router.put('/send-friend-request',sendFriendRequestValidator(),validateHandler,sendFriendRequest)
router.put('/accept-friend-request',acceptFriendRequestValidator(),validateHandler,acceptFriendRequest)
router.get('/notifications',getAllNotifications)
router.get('/friends',getAllFriends)

module.exports = router
