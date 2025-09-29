import pool from "../config/db.js";


export const sendGroupMessage = async (req, res) => {
    try {
        const { activity_id, sender_id, message } = req.body;

        if (!activity_id || !sender_id || !message) {
            return res.status(400).json({
                error: { code: "INVALID_INPUT", message: "activity_id, sender_id, message are required."}
            });
        }

        const result = await pool.query("INSERT INTO group_messages (activity_id, sender_id, message) VALUES ($1, $2, $3) RETURNING *", [activity_id, sender_id, message]);

        if (result.rows.length === 0) {
            throw new Error("Failed to send message in the group.")
        }

        return res.status(201).json({ data: result.rows[0] });
    } catch (e) {
        console.error("Send message to group error: ", e);
        return res.status(500).json({
            error: {
                code: "INTENAL_SERVER_ERROR",
                message: e.message || "Internal Server Error",
            }
        })
    }
}

export const getGroupMessage = async (req, res) => {
    try {
        const { activity_id } = req.params;

        if (!activity_id) {
            return res.status(400).json({
                error: { code: "INVALID_INPUT", message: "activity_id is required."}
            })
        }

        const result = await pool.query("SELECT gm.message_id, gm.message, gm.is_edited, gm.create_at, u.user_id, u.username, u.avatar_url FROM group_messages gm JOIN users u ON gm.sender_id = u.user_id WHERE gm.activity_id = $1 ORDER BY gm.create_at ASC", [activity_id]);

        return res.status(200).json({ data: result.rows });
    } catch (e) {
        console.error("Get Message group error: ", e);
        return res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error"
            }
        })
    }
}


export const sendPrivateMessage = async (req, res) => {
    const client = await pool.connect();

    try {
        const { sender_id, receiver_id, message } = req.body;

        if (!sender_id || !receiver_id || !message) {
            return res.status(400).json({
                error: { code: "INVALID_INPUT",  message: "All fields are required."}
            })
        }

        await client.query("BEGIN")

        const msg = await client.query("INSERT INTO private_messages (sender_id, receiver_id, message) VALUES ($1, $2, $3) RETURNING *", [sender_id, receiver_id, message]);

        const messageRow = msg.rows[0];

        let chat = await client.query("SELECT * FROM private_chat WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)", [sender_id, receiver_id]);
        
        if (chat.rows.length === 0) {
            chat = await client.query("INSERT INTO private_chat (user1_id, user2_id, last_message_id) VALUES ($1, $2, $3) RETURNING *", [sender_id, receiver_id, messageRow.message_id]);
        } else {
            await client.query("UPDATE private_chat SET last_message_id = $1, updated_at = CURRENT_TIMESTAMP WHERE chat_id = $2", [messageRow.message_id, chat.rows[0].chat_id]);
        }

        await client.query("COMMIT");

        return res.status(201).json({ data: messageRow });
    } catch (e) {
        client.query("ROLLBACK");
        console.error("Send private message error: ", e);
        return res.status(500).json({
            error: { code: "INTERNAL_SERVER_ERROR", message: e.message || "Internal Server Error" }
        })
    } finally {
        client.release();
    }
}

export const getPrivateMessage = async (req, res) => {
    try {
        const { user1_id, user2_id } = req.params;

        if (!user1_id || !user2_id) {
            return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Both user IDs are required."}});
        }

        const result = await pool.query(
            `SELECT pm.message_id, pm.message, pm.is_edited, pm.create_at, pm.updated_at,
            u.user_id, u.username, u.avatar_url
            FROM private_messages pm
            JOIN users u ON pm.sender_id = u.user_id
            WHERE (pm.sender_id = $1 AND pm.receiver_id = $2)
                OR (pm.sender_id = $2 AND pm.receiver_id = $1)
            ORDER BY pm.create_at ASC
            `, [user1_id, user2_id])
        return res.status(200).json({ data: result.rows });
    } catch (e) {
        console.error("Get Private Message Error: ", e);
        return res.status(500).json({
            error: {code: "INTERNAL_SERVER_ERROR", message: e.message || "Internal Server Error"}
        })
    }
}

export const getPrivateList = async (req, res) => {
     console.log("Req Params: ", req.params);
    try {
        const { user_id } = req.params;


        if (!user_id) {

            return res.status(400).json({ error: { code: "INVALID_INPUT", message: "user_id is required."}});
        }

        const result = await pool.query(
            `SELECT pc.chat_id, pc.updated_at,
                    u.user_id, u.username, u.avatar_url,
                    pm.message, pm.create_at as last_message_time
            FROM private_chat pc
            JOIN users u ON (CASE 
                            WHEN pc.user1_id = $1 THEN pc.user2_id
                            ELSE pc.user1_id
                            END) = u.user_id
            LEFT JOIN private_messages pm on pc.last_message_id = pm.message_id
            WHERE pc.user1_id = $1 OR pc.user2_id = $1
            ORDER BY pc.updated_at DESC`, [user_id]);

            return res.status(200).json({ data: result.rows });
    } catch (e) {
        console.error("Get Private List Error: ", e)
        return res.status(500).json({
            error: {code: "INTERNAL_SERVER_ERROR", message: e.message || "Internal Server Error"}
        })

    }
}