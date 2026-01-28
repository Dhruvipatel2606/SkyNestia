import express from "express";
import { getFeed } from "../controllers/PostController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getFeed);

export default router;
