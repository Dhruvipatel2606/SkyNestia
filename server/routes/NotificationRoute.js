import express from "express";
import { getNotifications, markNotificationsRead } from "../controllers/NotificationController.js";
import authMiddleWare from "../middleware/authMiddleware.js";

const router = express.Router();

router.get('/', authMiddleWare, getNotifications);
router.put('/read', authMiddleWare, markNotificationsRead);

export default router;
