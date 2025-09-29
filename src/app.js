import express from "express";
import cors from "cors";
import { createTables } from "./config/createTables.js";
import { logger } from "./middlewares/logger.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(logger);

app.use('/api/auth', authRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/messages', messageRoutes);
app.use(errorHandler);



(async () => {
    try {
        await createTables();
        app.listen(3000, () => {
            console.log(`Server running on http://localhost:3000`);
        });
    } catch (err) {
        console.error('Error starting server:', err);
    }
})();
