import express from "express";
import { register, login } from "../controllers/authController.js"
import { authMiddleware } from '../middlewares/authMiddleware.js';
const authRoutes = express.Router();
authRoutes.post('/register', register);
authRoutes.post('/login', login);

authRoutes.get('/profile', authMiddleware, (req, res) => {
    res.json({ message: "Welcome to profile", user: req.user});
})

export default authRoutes;