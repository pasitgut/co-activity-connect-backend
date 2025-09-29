import pool from "../config/db.js";

// เหลือ updatePassword + forgotPassword

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

export const updateUsername = async (req, res) => {  

    try {
        const { user_id, username } = req.body;

        if (!user_id || !username) {
            return res.status(400).json({
                error: { code: "INVALID_INPUT", message: "Field is required."}
            })
        }

        // check username existing 

        const usernameExisting = await pool.query("SELECT username FROM users WHERE username = $1", [username]);
        if (usernameExisting.rows.length !== 0) {
            throw new Error("Username is already.");
        }

        const result = await pool.query("UPDATE users SET username = $1 WHERE user_id = $2 RETURNING *", [username, user_id]);

        if (result.rows.length === 0) {
            throw new Error("Failed to update username.");
        }

        return res.status(200).json({
            data: result.rows[0]
        })
    } catch (e) {
        console.error("Update username error: ", e);
        return res.status(500).json({
            error: { code: "INTERNAL_SERVER_ERROR", message: e.message || "Internal Server Error" }
        })
    }
}

export const updateEmail = async (req, res) => {
    // check email existing 
    // update email 
    try {
        const { user_id, email } = req.body;
        if (!user_id || !email) {
             return res.status(400).json({
                error: { code: "INVALID_INPUT", message: "Field is required."}
            })
        }

        const emailExisting = await pool.query("SELECT email FROM users WHERE email = $1", [email]);
        if (emailExisting.rows.length !== 0) {
            throw new Error("Email is already.");
        }

        const result = await pool.query("UPDATE users SET email = $1 WHERE user_id = $2 RETURNING *",[email, user_id]);

        if (result.rows.length === 0) {
            throw new Error("Failed to update email.");
        }
        
        return res.status(200).json({
            data: result.rows[0]
        })
    } catch (e) {
        console.error("Update email error: ", e);
        return res.status(500).json({
            error: { code: "INTERNAL_SERVER_ERROR", message: e.message || "Internal Server Error" }
        })
    }
}

export const updatePassword = async (req, res) => {
    // update password 
}

export const updateYear = async (req, res) => {
    // update yaer 1-4
    try {
        const { user_id, year } = req.body;
        if (!user_id || !year) {
            return res.status(400).json({
                error: { code: "INVALID_INPUT", message: "Field is required."}
            })
        }

        const result = await pool.query("UPDATE users SET year_level = $1 WHERE user_id = $2 RETURNING *", [year, user_id]);

        if (result.rows.length === 0) {
            throw new Error("Failed to update year.")
        }

        return res.status(200).json({
            data: result.rows[0],
        })
    } catch (e) {
        console.error("Update year error: ", e);
        return res.status(500).json({
            error: { code: "INTERNAL_SERVER_ERROR", message: e.message || "Internal Server Error" }
        })
    }
}

export const updateFaculty = async (req, res) => {
    // update faculty
     try {
        const { user_id, faculty } = req.body;
        if (!user_id || !faculty) {
            return res.status(400).json({
                error: { code: "INVALID_INPUT", message: "Field is required."}
            })
        }

        const result = await pool.query("UPDATE users SET faculty = $1 WHERE user_id = $2 RETURNING *", [faculty, user_id]);

        if (result.rows.length === 0) {
            throw new Error("Failed to update faculty.")
        }

        return res.status(200).json({
            data: result.rows[0],
        })
    } catch (e) {
        console.error("Update faculty error: ", e);
        return res.status(500).json({
            error: { code: "INTERNAL_SERVER_ERROR", message: e.message || "Internal Server Error" }
        })
    }
} 

export const updateMajor = async (req, res) => {
    // update major 
    try {
        const { user_id, major } = req.body;
        if (!user_id || !major) {
            return res.status(400).json({
                error: { code: "INVALID_INPUT", message: "Field is required."}
            })
        }

        const result = await pool.query("UPDATE users SET major = $1 WHERE user_id = $2 RETURNING *", [major, user_id]);

        if (result.rows.length === 0) {
            throw new Error("Failed to update faculty.")
        }

        return res.status(200).json({
            data: result.rows[0],
        })
    } catch (e) {
        console.error("Update major error: ", e);
        return res.status(500).json({
            error: { code: "INTERNAL_SERVER_ERROR", message: e.message || "Internal Server Error" }
        })
    }
}

export const updateAvatarUrl = async (req, res) => {
    // update avatar url 
     try {
        const { user_id, avatar } = req.body;
        if (!user_id || !avatar) {
            return res.status(400).json({
                error: { code: "INVALID_INPUT", message: "Field is required."}
            })
        }

        const result = await pool.query("UPDATE users SET avatar_url = $1 WHERE user_id = $2 RETURNING *", [avatar, user_id]);

        if (result.rows.length === 0) {
            throw new Error("Failed to update avatar.")
        }

        return res.status(200).json({
            data: result.rows[0],
        })
    } catch (e) {
        console.error("Update avatar error: ", e);
        return res.status(500).json({
            error: { code: "INTERNAL_SERVER_ERROR", message: e.message || "Internal Server Error" }
        })
    }
}

export const updateBio = async (req, res) => {
    // update bio 
     try {
        const { user_id, bio } = req.body;
        if (!user_id || !bio) {
            return res.status(400).json({
                error: { code: "INVALID_INPUT", message: "Field is required."}
            })
        }

        const result = await pool.query("UPDATE users SET bio = $1 WHERE user_id = $2 RETURNING *", [bio, user_id]);

        if (result.rows.length === 0) {
            throw new Error("Failed to update faculty.")
        }

        return res.status(200).json({
            data: result.rows[0],
        })
    } catch (e) {
        console.error("Update bio error: ", e);
        return res.status(500).json({
            error: { code: "INTERNAL_SERVER_ERROR", message: e.message || "Internal Server Error" }
        })
    }
}

export const updateIsPrivate = async (req, res) => {
    // update is private true or false 
     try {
        const { user_id, is_private } = req.body;
        if (!user_id || !is_private) {
            return res.status(400).json({
                error: { code: "INVALID_INPUT", message: "Field is required."}
            })
        }

        const result = await pool.query("UPDATE users SET is_private = $1 WHERE user_id = $2 RETURNING *", [is_private, user_id]);

        if (result.rows.length === 0) {
            throw new Error("Failed to update is_private.")
        }

        return res.status(200).json({
            data: result.rows[0],
        })
    } catch (e) {
        console.error("Update is_private error: ", e);
        return res.status(500).json({
            error: { code: "INTERNAL_SERVER_ERROR", message: e.message || "Internal Server Error" }
        })
    }
}


export const forgotPassword = async (req, res) => {
    // question 
}