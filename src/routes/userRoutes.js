import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { getProfile, updateAvatarUrl, updateBio, updateEmail, updateFaculty, updateIsPrivate, updateMajor, updatePassword, updateUsername, updateYear } from "../controllers/userController";

const userRoutes = express.Router();

userRoutes.get("/", authMiddleware, getProfile);
userRoutes.patch("/username", authMiddleware, updateUsername);
userRoutes.patch("/email", authMiddleware, updateEmail);
userRoutes.patch("/password", authMiddleware, updatePassword);
userRoutes.patch("/faculty", authMiddleware, updateFaculty);
userRoutes.patch("/major", authMiddleware, updateMajor);
userRoutes.patch("/year", updateYear);
userRoutes.patch("/avatar-url", updateAvatarUrl);
userRoutes.patch("/bio", authMiddleware, updateBio);
userRoutes.patch("/is-private", authMiddleware, updateIsPrivate);