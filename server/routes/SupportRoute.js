import express from 'express';
import { contactSupport, getFAQ } from '../controllers/SupportController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/contact', authMiddleware, contactSupport);
router.get('/faq', getFAQ);

export default router;
