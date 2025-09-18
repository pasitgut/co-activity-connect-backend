import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import ApiError from "../ApiError.js";

export const registerUser = async (email, username, password) => {
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows[0]) throw new ApiError(409, "Email already exists");

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await pool.query("INSERT INTO users (email, username, password) VALUES ($1, $2, $3) RETURNING user_id, email, username", [email, username, hashedPassword]);
    return user.rows[0];
}

export const loginUser = async (email, password)  => {
    const result = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
    );
    const user = result.rows[0];
    if (!user) throw new ApiError(404, "User not found");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new ApiError(401, "Invalid credentials");

    const token = jwt.sign(
        { id: user.user_id, username: user.username, email: user.email },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: "1h" }
    );

    return { token, user: { id: user.user_id, username: user.username, email: user.email}};
}