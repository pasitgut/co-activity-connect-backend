import pool from "../config/db.js";

export const getProfile = async (req, res) => {
    try {
        const { user_id } = req.params;

        if (!user_id) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "user_id is required."
                }
            })
        }
        const result = await pool.query("SELECT * FROM users WHERE user_id = $1", [user_id]);
        if (result.rows.length === 0){
            throw new Error("Failed to get user profile.");
        }
        return res.status(200).json({
            data: result.rows[0]
        })
    } catch (e) {
        console.error("Get Profile error: ", e);
        return res.status(500).json({
            error: { code: "INTERNAL_SERVER_ERROR", message: e.message || "Internal Server Error"}
        })
    }
}

export const updateProfile = async (req, res) => {
    try {
        const { user_id, username, year, faculty, major, bio, is_private } = req.body;

        // ตรวจสอบว่า user_id ถูกส่งมาหรือไม่
        if (!user_id) {
            return res.status(400).json({
                error: { code: "INVALID_INPUT", message: "User ID is required." }
            });
        }

        const updateFields = [];
        const updateValues = [];
        let queryString = "UPDATE users SET";

        // เช็คว่ามีการส่งค่าที่ต้องการอัปเดตมาไหม และสร้างการอัปเดตสำหรับแต่ละฟิลด์
        if (username) {
            // ตรวจสอบว่า username มีอยู่ในระบบหรือไม่
            const usernameExisting = await pool.query("SELECT username FROM users WHERE username = $1", [username]);
            if (usernameExisting.rows.length !== 0) {
                throw new Error("Username is already taken.");
            }
            updateFields.push("username = $1");
            updateValues.push(username);
        }

        if (year) {
            updateFields.push("year_level = $2");
            updateValues.push(year);
        }

        if (faculty) {
            updateFields.push("faculty = $3");
            updateValues.push(faculty);
        }

        if (major) {
            updateFields.push("major = $4");
            updateValues.push(major);
        }

        if (bio) {
            updateFields.push("bio = $5");
            updateValues.push(bio);
        }

        if (is_private !== undefined) {
            updateFields.push("is_private = $6");
            updateValues.push(is_private);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                error: { code: "INVALID_INPUT", message: "No fields to update." }
            });
        }

        // สร้าง query สำหรับอัปเดต
        queryString += ` ${updateFields.join(", ")} WHERE user_id = $${updateFields.length + 1} RETURNING *`;
        updateValues.push(user_id);

        const result = await pool.query(queryString, updateValues);

        if (result.rows.length === 0) {
            throw new Error("Failed to update user profile.");
        }

        return res.status(200).json({
            data: result.rows[0]
        });
    } catch (e) {
        console.error("Update profile error: ", e);
        return res.status(500).json({
            error: { code: "INTERNAL_SERVER_ERROR", message: e.message || "Internal Server Error" }
        });
    }
};
