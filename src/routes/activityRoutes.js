import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { createActivity, getActivitiesJoined, getActivitiesNotJoined, getActivityMembers, joinActivity, updateJoinRequest } from "../controllers/activityController.js";
const activityRoutes = express.Router();

activityRoutes.post('/', authMiddleware, createActivity);
activityRoutes.post('/join', authMiddleware, joinActivity);
activityRoutes.get('/joined/:user_id', authMiddleware, getActivitiesJoined);
activityRoutes.get('/not-joined/:user_id', authMiddleware, getActivitiesNotJoined);
activityRoutes.get('/members/:activity_id', authMiddleware, getActivityMembers);
activityRoutes.put('/join', authMiddleware, updateJoinRequest);


export default activityRoutes;