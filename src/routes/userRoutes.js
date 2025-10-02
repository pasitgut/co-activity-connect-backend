import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { getProfile } from "../controllers/userController.js";

const userRoutes = express.Router();

userRoutes.get("/", authMiddleware, getProfile);
userRoutes.put("/", authMiddleware, (req, res) => {})


export default userRoutes;