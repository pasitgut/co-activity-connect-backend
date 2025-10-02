import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { getProfile, updateProfile } from "../controllers/userController.js";

const userRoutes = express.Router();

userRoutes.get("/", authMiddleware, getProfile);
userRoutes.put("/", authMiddleware, updateProfile)


export default userRoutes;