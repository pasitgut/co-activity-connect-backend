import express from "express";
import { logger } from "./middlewares/logger.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import authRouter from "./routes/authRoutes.js";
import groupRouter from "./routes/groupRoutes.js";
import { createTables } from "./createTables.js";

const app = express();

app.use(express.json());
app.use(logger);

app.use('/api/auth', authRouter)
app.use('/api/groups', groupRouter);

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
