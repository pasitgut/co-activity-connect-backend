import pool from "../config/db.js"
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const register = async (req, res) => {
    try {
        const { username, email, password, year_level, faculty, major } = req.body;
        if (!username || !email || !password || !year_level || !faculty || !major) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "Validation Failed."
                }
            })
        }

        // check username 
        const usernameExisting = await pool.query("SELECT user_id FROM users WHERE username = $1", [username]);
        if (usernameExisting.rows[0]) {
            return res.status(409).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "Username is already.",
                }
            })
        }
        // check email 
        const emailExisting = await pool.query("SELECT user_id FROM users WHERE email = $1", [email]);
        if (emailExisting.rows[0]) {
            return res.status(409).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "Email is already.",
                }
            })
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        const result = await pool.query("INSERT INTO users (username, email, password, year_level, faculty, major) VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id, username, email, year_level, faculty, major, avatar_url, is_private", [username, email, hashedPassword, year_level, faculty, major]);
        if (result.rows[0]) {
            return res.status(201).json({
                data: result.rows[0],
            })
        } else {
            return res.status(400).json({
                error: {
                    code: "BAD_REQUEST",
                    message: "create account failed."
                }
            })
        }
    } catch (e) {
        console.error("Register error: ", e);
        return res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error"
            }
        })
    }

}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "Validation Failed."
                }
            })
        }
        const accountExisting = await pool.query("SELECT user_id, username, email, password, year_level, faculty, major, avatar_url FROM users WHERE email = $1", [email]);
        if (!accountExisting.rows[0]) {
            return res.status(409).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "Account not found."
                }
            })
        }
        const user = accountExisting.rows[0];
        console.log('User: ', user);
        const verifyPassword = await bcrypt.compare(password, user.password);
        console.log(`Verify Password: ${verifyPassword}, ${user.password}`);
        if (!verifyPassword) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "Invalid credentials",
                }
            })
        }
        
        const token = jwt.sign(
            { id: user.user_id, username: user.username, email: user.email, year: user.year_level, faculty: user.faculty, major: user.major, avatar: user.avatar_url},
            process.env.JWT_SECRET || "secret",
        )
        return res.status(201).json({
            data: {
                token: token,
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                year: user.year_level,
                faculty: user.faculty,
                major: user.major,
                avatar_url: user.avatar_url
            }
        })
    } catch (e) {
        console.error("Login error: ", e);
        return res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error"
            }
        })
    }
}