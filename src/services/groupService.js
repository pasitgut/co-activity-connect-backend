import pool from "../config/db.js"


export const createGroup = async (owner_id, group_name, description, type, tags, is_private, max_members) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const existingGroup = await client.query("SELECT * FROM groups WHERE group_name = $1", [group_name]);

    if (existingGroup.rows[0]) throw new Error("Group name already exists");

    const newGroup = await client.query(
        "INSERT INTO groups (owner_id, group_name, description, type, tags, is_private, max_members) \
        VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *", [owner_id, group_name, description, type, tags, is_private, max_members]);
    // return newGroup.rows[0];
    const group = newGroup.rows[0];

     await client.query(
        "INSERT INTO group_members (group_id, user_id, role, is_approved) VALUES ($1, $2, $3, $4)",
        [group.group_id, owner_id, 'admin', true]
    );

    await client.query("COMMIT");
    return group;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

export const joinGroup = async (group_id, user_id) => {

    const existingGroup = await pool.query("SELECT * FROM groups WHERE group_id = $1", [group_id]);

    if (!existingGroup.rows[0]) throw new Error("Group not found!");

    const already = await pool.query("SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2", [group_id, user_id]);

    if (already.rows[0]) throw new Error("Already joined or pending approval");
    // check group is private or public 
    if (existingGroup.rows[0].is_private) {
        // private 
        const result = await pool.query("INSERT INTO group_members (group_id, user_id, is_approved) VALUES ($1, $2, $3) RETURNING *", [group_id, user_id, false]);
        return result.rows[0];
    } else {
        // public 
        const result = await pool.query("INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) RETURNING * ", [group_id, user_id]);
        return result.rows[0];
    }
}

export const getMembersInGroup = async (group_id) => {
    const result = await pool.query("SELECT gm.*, u.username FROM group_members gm \
        JOIN users u ON gm.user_id = u.user_id \
        WHERE gm.group_id = $1 AND gm.is_approved = true", [group_id]);
    return result.rows;
}