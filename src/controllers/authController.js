import { registerUser, loginUser } from "../services/authService.js";
import ApiError from "../ApiError.js";

export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!email|| !password) {
            return res.status(400).json({
                success: false,
                message: "Username, email, or password is missing",
            })
        }
        const user = await registerUser(email, username, password);
        return res.status(201).json({
            success: true,
            message: "User registerd successfully.",
            data: { user }, 
        })
    } catch (err) {
        console.error("Register error: ", err.message);

        const status = err instanceof ApiError ? err.statusCode : 500;

        return res.status(status).json({
            success: false,
            message: err.message || "Internal Server Error"
        })
    }

}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email|| !password) {
            return res.status(400).json({
                success: false,
                message: "Username, email, or password is missing",
            })
        }
        const data = await loginUser(email, password);
        return res.status(200).json({ success: true, message: "Login successful", data })
    } catch (err) {
        console.error("Login error: ", err.message);
        
        const status = err instanceof ApiError ? err.statusCode : 500;

        return res.status(status).json({
            success: false,
            message: err.message || "Internal Server Error",
        })
    }
}