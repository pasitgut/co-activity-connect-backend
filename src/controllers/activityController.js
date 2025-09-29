
import pool from "../config/db.js";

// update activity 

export const createActivity = async (req, res) => {
     const client = await pool.connect();
    try {  

        const { user_id, title, description, max_member, is_public, type, tags, } = req.body;

        if (!user_id || !title || !description || !max_member || !is_public || !tags || !type) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "Validation failed.",
                }
            })
        }
        await client.query("BEGIN");
        const createActivity = await client.query("INSERT INTO activities (creator_id, title, description, max_member, is_public, type, tags) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *", [user_id, title, description, max_member, is_public, type, tags]);
        if (createActivity.rows.length === 0) {
            throw new Error('Failed to create activity.');
        }

        const activity = createActivity.rows[0];
        const addUser = await client.query("INSERT INTO activity_members (activity_id, user_id, role, status) VALUES ($1, $2, $3, $4) RETURNING *", [activity.activity_id, user_id, 'admin', 'accepted']);
        
        if (addUser.rows.length === 0) {
            throw new Error('Failed to add user to activity.');
        }

        const updateCurrentMember = await client.query("UPDATE activities SET current_member = current_member + 1 WHERE activity_id = $1 RETURNING current_member", [activity.activity_id]);
        
        if (updateCurrentMember.rows.length === 0) {
            throw new Error('Failed to update current member count.');
        }

        await client.query("COMMIT");

        return res.status(201).json({
            data: {
                activity_id: activity.activity_id,
                title: activity.title,
                description: activity.description,
                max_member: activity.max_member,
                current_member: updateCurrentMember.rows[0].current_member,
                is_public: activity.is_public,
                type: activity.type,
                tags: activity.tags,
                create_at: activity.create_at
            }
        })
    } catch (e) {
        await client.query("ROLLBACK");

        console.error("Create Activity Error: ", e);
        
        return res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server error"
            }
        })
    } finally {
        client.release();
    }
}

export const joinActivity = async (req, res) => {
    const client = await pool.connect();
    try {
        const { activity_id, user_id } = req.body;

        if (!activity_id || !user_id) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "Validation failed."
                }
            })
        }
        await client.query("BEGIN");

        // check status is pending 
        const isPending = await client.query("SELECT status FROM activity_member WHERE activity_id = $1 AND user_id = $2", [activity_id, user_id]);
        if (isPending.rows.length == 0) {
            throw new Error("Failed to get status.")
        }

        if (isPending.rows[0] !== 'pending') {
            throw new Error("Failed to update status.")
        }
        // check is_public for activity 
        const activityStatus = await client.query("SELECT is_public FROM activities WHERE activity_id = $1", [activity_id]);
        if (activityStatus === true) {
            // public 
            const result = await client.query("INSERT INTO activity_members (activity_id, user_id, status) VALUES ($1, $2, $3) RETURNING *", [activity_id, user_id, 'pending']);
            if (result.rows.length === 0) {
                throw new Error("Failed to join activity.");
            } else {
                 const uppdateCurrentMember = await client.query("UPDATE activities SET current_member = current_member + 1 WHERE activity_id = $1 RETURNING *", [activity_id]);
                if (uppdateCurrentMember.rows.length === 0) {
                    throw new Error("Failed to update current member count.");
                } else {
                    await client.query("COMMIT");
                    return res.status(201).json({
                    data: {
                        status: result.rows[0].status
                    },
                })
                }
            }
        } else {
            // private 
            const result = await client.query("INSERT INTO activity_members (activity_id, user_id, status) VALUES ($1, $2, $3) RETURNING *", [activity_id, user_id, 'accepted']);
            if (result.rows.length === 0) {
                throw new Error("Failed to join activity.");
            } else {
                const uppdateCurrentMember = await client.query("UPDATE activities SET current_member = current_member + 1 WHERE activity_id = $1 RETURNING *", [activity_id]);
                if (uppdateCurrentMember.rows.length === 0) {
                    throw new Error("Failed to update current member count.");
                } else {
                    await client.query("COMMIT");
                    return res.status(201).json({
                    data: {
                        status: result.rows[0].status
                    },
                })
                }
            }
        }
    } catch (e) {
        await client.query("ROLLBACK");
        console.error("Join activity error: ", e);
        return res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error",
            }
        })
    } finally {
        client.release();
    }

}

export const getActivitiesJoined = async (req, res) => {
    try {
        const { user_id } = req.params;
        console.log("User id: ", user_id);
        if (!user_id) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "Validation Failed."
                }
            })
        }

        const result = await pool.query('SELECT a.activity_id, a.creator_id, a.title, a.description, a.max_member, a.current_member, a.is_public, a.type, a.tags FROM activities a JOIN activity_members am ON a.activity_id = am.activity_id AND am.user_id = $1', [user_id])

        return res.status(200).json({
            data: result.rows
        })
    } catch (e) {
        console.error("Fetch Joined Activities Error: ", e);
        return res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error"
            }
        })
    }
}

export const getActivitiesNotJoined = async (req, res) => {
    try {
        const { user_id } = req.params;
        console.log("User id: ", user_id);
        if (!user_id) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "Validation Failed."
                }
            })
        }

        const result = await pool.query('SELECT a.activity_id, a.creator_id, a.title, a.description, a.max_member, a.current_member, a.is_public, a.type, a.tags FROM activities a JOIN activity_members am ON a.activity_id = am.activity_id AND am.user_id != $1', [user_id])

        return res.status(200).json({
            data: result.rows
        })
    } catch (e) {
        console.error("Fetch Joined Activities Error: ", e);
        return res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error"
            }
        })
    }
}

export const updateJoinRequest = async (req, res) => {
    try {
        const { activity_id, status, user_id } = req.body;

        if (!activity_id || !status || !user_id) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "activity_id, status, user_id are required."
                }
            })
        }

        if (!['accpeted', 'rejected'].includes(status)) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "Status must be either acccpeted or rejected."
                }
            })
        }

        const result = await pool.query(
            'UPDATE activity_members SET status = $1 WHERE user_id = $2 AND activity_id = $3', [status, user_id, activity_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: "NOT_FOUND",
                    message: "Participant not found."
                }
            })
        }

        if (status === "accpeted") {
            await pool.query("UPDATE activities SET current_member = current_member + 1 WHERE activity_id = $1", [activity_id]);
        }

        return res.status(200).json({
            data: result.rows[0]
        })
    } catch (e) {
        console.error("Update join request error: ", e);
        return res.status(500).json({
            error: {
                code: "INERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error",
            }
        })
    }
}

export const getActivityMembers = async (req, res) => {
    try {
        const { activity_id } = req.params;

        if (!activity_id) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "activity_id is required.",
                }
            })
        }

    const result = await pool.query("SELECT am.participant_id, am.user_id, am.role, am.status, am.joined_at, u.username, u.email, u.avatar_url FROM activity_members am JOIN users u ON am.user_id = u.user_id WHERE am.activity_id = $1 AND status = 'accepted'", [activity_id]);

    return res.status(200).json({
        data: result.rows
    })
    } catch (e) {
        console.error("Get Activity Members Error: ", e);
        return res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error"
            }
        })
    }
}


/// 
export const updateActivity = async (req, res) => {

}