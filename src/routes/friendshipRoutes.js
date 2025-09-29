import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { getAllMembers, getFriendProfileById, getMyFriend, sendFriendRequest, updateFriendRequest } from "../controllers/friendshipController";

const friendShipRoutes = express.Router();

friendShipRoutes.get("/", authMiddleware, getAllMembers);
friendShipRoutes.get("/my-friend", authMiddleware, getMyFriend);
friendShipRoutes.get("/by-id/:user_id", authMiddleware, getFriendProfileById);
friendShipRoutes.post('/', authMiddleware, sendFriendRequest);
friendShipRoutes.put('/',authMiddleware, updateFriendRequest);