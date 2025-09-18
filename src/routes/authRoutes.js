import express from "express";
import { register, login } from "../controllers/authController.js"
import { authMiddleware } from '../middlewares/authMiddleware.js';
const authRouter = express.Router();
authRouter.post('/register', register);
authRouter.post('/login', login);

authRouter.get('/profile', authMiddleware, (req, res) => {
    res.json({ message: "Welcome to profile", user: req.user});
})

export default authRouter;