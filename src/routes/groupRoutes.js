import express from "express";
import { createGroupController, getMembersInGroupController, joinedGroupController } from "../controllers/groupController.js" ;
import { authMiddleware } from "../middlewares/authMiddleware.js";


const groupRouter = express.Router();

groupRouter.post('/', authMiddleware, createGroupController);
groupRouter.post('/:group_id/join', authMiddleware, joinedGroupController);
groupRouter.get('/:group_id/members', authMiddleware, getMembersInGroupController);

export default groupRouter;