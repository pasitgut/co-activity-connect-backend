import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";


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
    const { user_id, username, year, faculty, major, bio, is_private, avatar_url } = req.body;

    if (!user_id) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "User ID is required." }
      });
    }

    const updateFields = [];
    const updateValues = [];

    // ตรวจสอบ username ว่าซ้ำกับ user อื่นหรือไม่
    if (username) {
      const usernameExisting = await pool.query(
        "SELECT username FROM users WHERE username = $1 AND user_id != $2",
        [username, user_id]
      );

      if (usernameExisting.rows.length > 0) {
        return res.status(400).json({
          error: { code: "USERNAME_TAKEN", message: "Username is already taken." }
        });
      }

      updateFields.push(`username = $${updateValues.length + 1}`);
      updateValues.push(username);
    }

    if (year) {
      updateFields.push(`year_level = $${updateValues.length + 1}`);
      updateValues.push(year);
    }

    if (faculty) {
      updateFields.push(`faculty = $${updateValues.length + 1}`);
      updateValues.push(faculty);
    }

    if (major) {
      updateFields.push(`major = $${updateValues.length + 1}`);
      updateValues.push(major);
    }

    if (bio) {
      updateFields.push(`bio = $${updateValues.length + 1}`);
      updateValues.push(bio);
    }

    if (is_private !== undefined) {
      updateFields.push(`is_private = $${updateValues.length + 1}`);
      updateValues.push(is_private);
    }

    if (avatar_url) {
      updateFields.push(`avatar_url = $${updateValues.length + 1}`);
      updateValues.push(avatar_url);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "No fields to update." }
      });
    }

    // เติม user_id เป็นเงื่อนไขสุดท้าย
    updateValues.push(user_id);

    const queryString = `
      UPDATE users 
      SET ${updateFields.join(", ")} 
      WHERE user_id = $${updateValues.length} 
      RETURNING user_id, username, email, year_level, faculty, major, avatar_url, bio;
    `;

    const result = await pool.query(queryString, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "User not found or update failed." }
      });
    }

    const user = result.rows[0];

    // ✅ สร้าง token ใหม่เหมือน login
    const token = jwt.sign(
      {
        id: user.user_id,
        username: user.username,
        email: user.email,
        year: user.year_level,
        faculty: user.faculty,
        major: user.major,
        avatar: user.avatar_url,
        bio: user.bio,
      },
      process.env.JWT_SECRET || "secret"
    );

    return res.status(200).json({
      data: {
        token: token,
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        year: user.year_level,
        faculty: user.faculty,
        major: user.major,
        avatar_url: user.avatar_url,
        bio: user.bio ?? "",
      }
    });
  } catch (e) {
    console.error("Update profile error: ", e);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: e.message || "Internal Server Error" }
    });
  }
};

