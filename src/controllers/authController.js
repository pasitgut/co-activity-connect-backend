import { registerUser, loginUser } from "../services/authService.js";

export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password ) throw new Error("username or email or password is empty");
        const user = await registerUser(email, username, password);
        res.status(201).json({ message: 'User registered', user});
    } catch (err) {
        res.status(400).json({ error: err.message });
    }

}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email|| !password) throw new Error("email or password is empty");
        const data = await loginUser(email, password);
        res.status(200).json({ message: "Login successful", ...data })
    } catch (err) {
        res.status(400).json({ error: err.message});
    }
}