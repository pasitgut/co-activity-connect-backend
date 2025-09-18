import { createGroup, joinGroup, getMembersInGroup } from "../services/groupService.js"

export const createGroupController = async (req, res) => {
    try {
        const {group_name, description, type, tags, is_private, max_members } = req.body;
        const owner_id = req.user.id;

        const group = await createGroup(owner_id, group_name, description, type, tags, is_private, max_members);
        res.status(201).json({ message: "Group created successfully", group});
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}

export const joinedGroupController = async (req, res) => {
    try {
        const { group_id } = req.params;
        console.log("User: ", req.user);
        const user_id = req.user.id;

        const member = await joinGroup(group_id, user_id);
        res.status(201).json({ message: "Join request submitted", member});
    } catch (err) {
        res.status(400).json({ error: err.message});
    }
}

export const getMembersInGroupController = async (req, res) => {
    try {
        const { group_id } = req.params;
        const members = await getMembersInGroup(group_id);
        res.status(200).json({ members });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}