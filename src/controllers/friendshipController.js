import pool from "../config/db.js";

// ดึงข้อมูลรายชื่อคนที่ยังไม่ได้เป็นเพื่อน
export const getAllMembers = async (req, res) => {
    try {
        const { user_id } = req.params;

        if (!user_id) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "User id is required."
                }
            })
        }
        const result = await pool.query("SELECT u.user_id, u.username, u.avatar_url, FROM users u WHERE u.user_id != $1", [user_id]);

        
        return res.status(200).json({ data: result.rows });
    } catch (e) {   
        console.error("Get All Member error: ", e);
        return res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error"
            }
        })
    }
}

// ดึงข้อมูลรายชื่อเพื่อนของฉันทั้งหมด
export const getMyFriendList = async (req, res) => {
    try {
        const { user_id } = req.params;

        if (!user_id) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "User id is required."
                }
            })
        }

        const result = await pool.query("SELECT u.username, u.avatar FROM friendships fs JOIN users u ON fs.friend_id = u.user_id WHERE fs.user_id = $1", [user_id]);

        return res.status(200).json({
            data: result.rows,
        })
    } catch (e) {
        console.error("Get My firend error: ", e);
        return res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error"
            }
        })
    }
}

// ดึงข้อมูล profile ของเพื่อนและสถานะการเป็นเพื่อน
export const  getFriendProfileById = async (req, res) => {
    try {
        const { user_id } = req.params;

        if (!friend_id) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "Friend id is required."
                }
            })
        }

        const result = await pool.query("SELECT u.username, u.year_level, u.faculty, u.major, u.avatar_url, u.bio, u.is_private fs.status FROM users u JOIN friendships fs ON users.user_id = fs.friend_id WHERE u.user_id = $1", [user_id]);

        return res.status(200).json({
            data: result.rows,
        })
    } catch (e) {
        console.error("Get Friend Profile By Id error: ", e);
        return res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error"
            }
        })
    }
}

// ส่งคำขอเป็นเพื่อน 
export const sendFriendRequest = async (req, res) => {
    try {
        const { user_id, friend_id } = req.body;

        if (!user_id || !friend_id) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "user_id and friend_id and required."
                }
            })
        }

        if (user_id == friend_id) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "You cannot send a friend request to yourself."
                }
            })
        }

        const existing = await pool.query("SELECT * FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)", [user_id, friend_id]);

        if (existing.rows.length > 0) {
            return res.status(400).json({
                error: {
                    code: "AlREADY_EXISTS",
                    message: "Friend request already exists or you're already friends."
                }
            })
        }

        const result = await pool.query("INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, 'pending') RETUNRING *", [user_id, friend_id]);

        return res.status(201).json({ data: { 
            data: result.rows[0],
            message: "Firend request send successfully."
        }})
    } catch (e) {
        console.error("Send Friend Request error: ", e);
        return res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error"
            }
        })
    }

}

// อัพเดทคำขอเป็นเพื่อน
export const updateFriendRequest = async (req, res) => {
    try {
        const { user_id, friend_id, status } = req.body;

        if (!user_id || !friend_id || !['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "user_id, friend_id and status are required."
                }
            })
        }

        const result = await pool.query("UPDATE friendships SET status = $3 WHERE user_id = $1 AND friend_id = $2 AND status = 'pending' RETURNING *", [user_id, friend_id, status]);
        if (result.rowCount === 0) {
            return res.status(404).json({
                error: {
                    code: "NOT_FOUND",
                    message: "Friend request not found or already responded."
                }
            })
        }

        return res.status(200).json({
            data: {
                data: result.rows[0],
                message: `Friend request ${status} successfull.`
            }
        })
    } catch (e) {
        console.error("Update firend request error: ", e);
        return res.status(500).json({
            erorr: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error"
            }
        })
    }
}

// ดึงข้อมูลคำขอเป็นเพื่อน
export const getSendRequestFriend = async (req, res) => {
    try {
        const { user_id } = req.params;

        if (!user_id) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "User id is required."
                }
            })
        }

        const result = await pool.query("SELECT u.avatar_url, u.username FROM friendships fs JOIN users u ON fs.friend_id = u.user_id  WHERE fs.user_id = $1 AND fs.status = 'pending'", [user_id]);
        
        return res.status(200).json({
            data: result.rows,
        })
        
    } catch (e) {
        console.error("Get Send Request Friend error: ", e);
        return res.status(500).json({
            erorr: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error"
            }
        })
    }
}