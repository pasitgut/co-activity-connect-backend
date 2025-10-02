import express from "express";
import { sendGroupMessage, getGroupMessage, sendPrivateMessage, getPrivateMessage, getPrivateList } from "../controllers/messageController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const messageRoutes = express.Router();

// Group Chat 
messageRoutes.post("/group/send", authMiddleware, sendGroupMessage);
messageRoutes.get("/group/:activity_id", authMiddleware, getGroupMessage);

// Private Chat 
messageRoutes.post("/private/send", authMiddleware, sendPrivateMessage);
messageRoutes.get('/private/chat/:user1_id/:user2_id', authMiddleware, getPrivateMessage);
messageRoutes.get("/private/list/:user_id", authMiddleware, getPrivateList);


export default messageRoutes;