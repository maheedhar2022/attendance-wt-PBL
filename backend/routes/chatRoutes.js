const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.post('/', protect, chatController.handleChat);

module.exports = router;
