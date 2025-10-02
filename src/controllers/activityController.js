
import pool from "../config/db.js";

// update activity 

export const createActivity = async (req, res) => {
     const client = await pool.connect();
    try {  

        const { user_id, title, description, max_member, is_public, type, tags, } = req.body;

        if (!user_id || !title || !description || !max_member || !is_public) {
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
                    message: "Validation failed. Activity ID and User ID are required."
                }
            });
        }

        await client.query("BEGIN");

        // Check if the user already has a status for this activity
        const isJoinedResult = await client.query(
            "SELECT status FROM activity_members WHERE activity_id = $1 AND user_id = $2",
            [activity_id, user_id]
        );

        let currentStatus = null; // Initialize currentStatus variable

        if (isJoinedResult.rows.length > 0) {
            currentStatus = isJoinedResult.rows[0].status;

            // If the status is 'pending' or 'accepted', user can't join again
            if (['pending', 'accepted'].includes(currentStatus)) {
                return res.status(400).json({
                    error: {
                        code: "ALREADY_JOINED",
                        message: "You have already joined or your request is pending/accepted."
                    }
                });
            }

            // If the status is 'rejected', update it to 'pending' or 'accepted' based on activity visibility
            if (currentStatus === 'rejected') {
                // Check if activity is public or private
                const activityStatusResult = await client.query(
                    "SELECT is_public FROM activities WHERE activity_id = $1",
                    [activity_id]
                );

                if (activityStatusResult.rows.length === 0) {
                    throw new Error("Activity not found.");
                }

                const isPublic = activityStatusResult.rows[0].is_public;

                // If the activity is public, update status to 'accepted'
                const updatedStatus = isPublic ? 'accepted' : 'pending';

                await client.query(
                    "UPDATE activity_members SET status = $1 WHERE activity_id = $2 AND user_id = $3",
                    [updatedStatus, activity_id, user_id]
                );

                // Set currentStatus to the updated status
                currentStatus = updatedStatus;
            }
        } else {
            // If the user hasn't joined yet, create a new entry
            const activityStatusResult = await client.query(
                "SELECT is_public FROM activities WHERE activity_id = $1",
                [activity_id]
            );

            if (activityStatusResult.rows.length === 0) {
                throw new Error("Activity not found.");
            }

            const isPublic = activityStatusResult.rows[0].is_public;
            const newStatus = isPublic ? 'accepted' : 'pending';

            // Insert a new entry for the user joining the activity
            await client.query(
                "INSERT INTO activity_members (activity_id, user_id, status) VALUES ($1, $2, $3)",
                [activity_id, user_id, newStatus]
            );

            // Set currentStatus to the new status
            currentStatus = newStatus;
        }

        // Only increase current_member if status is 'accepted'
        if (currentStatus === 'accepted') {
            const updateCurrentMember = await client.query(
                "UPDATE activities SET current_member = current_member + 1 WHERE activity_id = $1 RETURNING *",
                [activity_id]
            );

            if (updateCurrentMember.rows.length === 0) {
                throw new Error("Failed to update current member count.");
            }
        }

        // Commit the transaction
        await client.query("COMMIT");

        // Return success response
        return res.status(201).json({
            data: {
                status: currentStatus,  // Return the correct currentStatus
            },
        });

    } catch (e) {
        await client.query("ROLLBACK");
        console.error("Join activity error: ", e);
        return res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error",
            }
        });
    } finally {
        client.release();
    }
};


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
            });
        }

        // เพิ่มเงื่อนไขตรวจสอบว่า status เป็น 'accepted'
        const result = await pool.query(
            `SELECT a.activity_id, a.creator_id, a.title, a.description, 
                    a.max_member, a.current_member, a.is_public, a.type, a.tags 
             FROM activities a 
             JOIN activity_members am ON a.activity_id = am.activity_id 
             WHERE am.user_id = $1 AND am.status = 'accepted'`, 
            [user_id]
        );

        return res.status(200).json({
            data: result.rows
        });

    } catch (e) {
        console.error("Fetch Joined Activities Error: ", e);
        return res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error"
            }
        });
    }
}


export const getActivitiesPending = async (req, res) => {
    try {
        const { user_id } = req.params;
        console.log("User id: ", user_id);

        if (!user_id) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "Validation Failed."
                }
            });
        }

        // เพิ่มเงื่อนไขตรวจสอบว่า status เป็น 'accepted'
        const result = await pool.query(
            `SELECT a.activity_id, a.creator_id, a.title, a.description, 
                    a.max_member, a.current_member, a.is_public, a.type, a.tags 
             FROM activities a 
             JOIN activity_members am ON a.activity_id = am.activity_id 
             WHERE am.user_id = $1 AND am.status = 'pending'`, 
            [user_id]
        );

        return res.status(200).json({
            data: result.rows
        });

    } catch (e) {
        console.error("Fetch Joined Activities Error: ", e);
        return res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error"
            }
        });
    }
}

export const getActivitiesNotJoined = async (req, res) => {
    try {
        const { user_id } = req.params;
        console.log("User id: ", user_id);

        if (!user_id || user_id === '') {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "User ID cannot be empty."
                }
            });
        }

        // ดึงกิจกรรมที่ผู้ใช้ยังไม่เข้าร่วม หรือสถานะเป็น 'pending' หรือ 'rejected'
        const result = await pool.query(
            `SELECT a.activity_id, a.creator_id, a.title, a.description, 
                    a.max_member, a.current_member, a.is_public, a.type, a.tags
             FROM activities a
             LEFT JOIN activity_members am ON a.activity_id = am.activity_id AND am.user_id = $1
             WHERE am.user_id IS NULL OR am.status = 'rejected'`,
            [user_id]
        );

        return res.status(200).json({
            data: result.rows
        });

    } catch (e) {
        console.error("Fetch Activities Not Joined Error: ", e);
        return res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error"
            }
        });
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

        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "Status must be either accepted or rejected."
                }
            })
        }

        const result = await pool.query(
            'UPDATE activity_members SET status = $1 WHERE user_id = $2 AND activity_id = $3 RETURNING *', [status, user_id, activity_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: "NOT_FOUND",
                    message: "Participant not found."
                }
            })
        }

        // เพิ่ม current_member เมื่อสถานะเป็น "accepted"
        if (status === "accepted") {
            await pool.query(
                "UPDATE activities SET current_member = current_member + 1 WHERE activity_id = $1", [activity_id]
            );
        }

        return res.status(200).json({
            data: result.rows[0]
        })
    } catch (e) {
        console.error("Update join request error: ", e);
        return res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
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
            });
        }

        // Query to fetch members with status 'accepted' or 'pending'
        const result = await pool.query(
            "SELECT am.participant_id, am.user_id, am.role, am.status, am.joined_at, u.username, u.email, u.avatar_url " +
            "FROM activity_members am " +
            "JOIN users u ON am.user_id = u.user_id " +
            "WHERE am.activity_id = $1 AND (am.status = 'accepted' OR am.status = 'pending')", 
            [activity_id]
        );

        return res.status(200).json({
            data: result.rows
        });
    } catch (e) {
        console.error("Get Activity Members Error: ", e);
        return res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error"
            }
        });
    }
};



/// 
export const updateActivity = async (req, res) => {
    const client = await pool.connect(); // ใช้ client จาก pool
    try {
        const  { activity_id, title, description, max_member, is_public, type, tags } = req.body;
        console.log(`ActivityId: ${activity_id} : Title: ${title} : Description: ${description} : MaxMember: ${max_member} : Is Public: ${is_public} : tag`)
        // ตรวจสอบว่า activity_id และข้อมูลที่จำเป็นมีครบ
        if (!activity_id || max_member === undefined || is_public === undefined || !title) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "activity_id, max_member, title, type, and is_public are required."
                }
            });
        }

        // เริ่มต้น transaction
        await client.query('BEGIN');

        // ตรวจสอบ activity_id ว่ามีในฐานข้อมูลหรือไม่
        const activityResult = await client.query(
            'SELECT * FROM activities WHERE activity_id = $1',
            [activity_id]
        );

        if (activityResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                error: {
                    code: "NOT_FOUND",
                    message: "Activity not found."
                }
            });
        }

        // ตรวจสอบว่า max_member ใหม่ไม่น้อยกว่า current_member
        const currentActivity = activityResult.rows[0];
        if (max_member < currentActivity.current_member) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "max_member cannot be less than current_member."
                }
            });
        }

        // อัปเดตข้อมูลกิจกรรม
        const updateQuery = `
            UPDATE activities
            SET
                title = $1,
                description = $2,
                max_member = $3,
                is_public = $4,
                tags = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE activity_id = $6
            RETURNING *;
        `;
        const result = await client.query(updateQuery, [
            title,
            description,
            max_member,
            is_public,
            tags,
            activity_id
        ]);

        // Commit transaction
        await client.query('COMMIT');

        // ส่งผลลัพธ์กลับ
        return res.status(200).json({
            data: result.rows[0]
        });

    } catch (e) {
        // หากเกิดข้อผิดพลาด จะทำการ rollback และส่ง error
        await client.query('ROLLBACK');
        console.error("Update Activity error: ", e);
        return res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error"
            }
        });
    } finally {
        client.release(); // ปล่อย client กลับ pool
    }
};

// remove Member from activity
export const rejectedMember = async (req, res) => {
    const client = await pool.connect(); // ใช้ client จาก pool
    try {
        const { activity_id, user_id } = req.body;

        // ตรวจสอบ input
        if (!activity_id || !user_id) {
            return res.status(400).json({
                error: {
                    code: "INVALID_INPUT",
                    message: "activity_id and user_id are required."
                }
            });
        }

        // เริ่มต้น transaction
        await client.query('BEGIN');

        // อัปเดต status เป็น "rejected" ใน activity_members
        const result = await client.query(
            'UPDATE activity_members SET status = $1 WHERE user_id = $2 AND activity_id = $3 RETURNING *',
            ['rejected', user_id, activity_id]
        );

        // ถ้าไม่พบข้อมูลใน activity_members
        if (result.rows.length === 0) {
            await client.query('ROLLBACK'); // Rollback หากไม่พบสมาชิก
            return res.status(404).json({
                error: {
                    code: "NOT_FOUND",
                    message: "Participant not found."
                }
            });
        }

        // ลด current_member ลงหนึ่ง ใน activities
        await client.query(
            'UPDATE activities SET current_member = current_member - 1 WHERE activity_id = $1',
            [activity_id]
        );

        // Commit transaction
        await client.query('COMMIT');

        // ส่งผลลัพธ์กลับ
        return res.status(200).json({
            data: result.rows[0]
        });
    } catch (e) {
        // หากเกิดข้อผิดพลาด จะทำการ rollback และส่ง error
        await client.query('ROLLBACK');
        console.error("Update Member error: ", e);
        return res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: e.message || "Internal Server Error"
            }
        });
    } finally {
        client.release(); // ปล่อย client กลับ pool
    }
};
