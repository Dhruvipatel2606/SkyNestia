import express from 'express';
import { addMessage, getMessages, upload, markAsRead, deleteMessage } from '../controllers/MessageController.js';

const router = express.Router();

router.post('/', upload.single('image'), addMessage);
router.get('/:chatId', getMessages);
router.put('/:chatId/read/:userId', markAsRead);
router.delete('/:messageId', deleteMessage);

export default router;
