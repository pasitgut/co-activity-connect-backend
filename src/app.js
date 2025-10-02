import express from "express";
import cors from "cors";
import http, { createServer } from "http";
import { Server } from "socket.io";
import { createTables } from "./config/createTables.js";
import { logger } from "./middlewares/logger.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import pool from "./config/db.js";
const app = express();
const server = createServer(app);
const io = new Server(server, {
  path: '/my-websocket/', // <-- เพิ่มบรรทัดนี้
  cors: {
    origin: '*', 
    methods: ['GET', 'POST']
  },
  allowEIO3: true,
});
const userSockets = new Map();
io.engine.on('connection_error', (err) => {
  console.error('Engine connection_error:', err.req, err.message, err.code, err.context);
});
io.on('connection', (socket) => {
    console.log('User connected: ', socket.id);

    socket.on('register', (userId) => {
    userSockets.set(userId, socket.id);
    socket.userId = userId;
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

      socket.on('join:activity', (activityId) => {
    socket.join(`activity:${activityId}`);
    console.log(`Socket ${socket.id} joined activity:${activityId}`);
  });
  socket.on('leave:activity', (activityId) => {
    socket.leave(`activity:${activityId}`);
  });

  socket.on('join:private', (chatId) => {
    socket.join(`private:${chatId}`);
    console.log(`Socket ${socket.id} joined private:${chatId}`);
  });

  socket.on('leave:private', (chatId) => {
    socket.leave(`private:${chatId}`);
  });

  socket.on('message:group', async (data) => {
    try {
      const { activityId, senderId, message } = data;
    
    console.log("Message Group: ", activityId, senderId, message);
      // Insert message to database
      const result = await pool.query(
        `INSERT INTO group_messages (activity_id, sender_id, message, create_at, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING message_id, activity_id, sender_id, message, is_edited, create_at, updated_at`,
        [activityId, senderId, message]
      );

      const newMessage = result.rows[0];

      // Get sender info
      const userResult = await pool.query(
        'SELECT user_id, username, avatar_url FROM users WHERE user_id = $1',
        [senderId]
      );

      const messageWithUser = {
        ...newMessage,
        sender: userResult.rows[0]
      };

      // Broadcast to activity room
      io.to(`activity:${activityId}`).emit('message:group:received', messageWithUser);

    } catch (error) {
      console.error('Error sending group message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('message:private', async (data) => {
    try {
      const { chatId, senderId, receiverId, message } = data;

      // Insert message to database
      const result = await pool.query(
        `INSERT INTO private_messages (sender_id, receiver_id, message, create_at, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING message_id, sender_id, receiver_id, message, is_read, is_edited, create_at, updated_at`,
        [senderId, receiverId, message]
      );

      const newMessage = result.rows[0];

      // Update last_message_id in private_chat
      await pool.query(
        `UPDATE private_chat 
         SET last_message_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE chat_id = $2`,
        [newMessage.message_id, chatId]
      );

      // Get sender info
      const userResult = await pool.query(
        'SELECT user_id, username, profile_image FROM users WHERE user_id = $1',
        [senderId]
      );

      const messageWithUser = {
        ...newMessage,
        chat_id: chatId,
        sender: userResult.rows[0]
      };

      // Send to chat room
      io.to(`private:${chatId}`).emit('message:private:received', messageWithUser);

      // Also send notification to receiver if they're online but not in the room
      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message:private:notification', {
          chatId,
          message: messageWithUser
        });
      }

    } catch (error) {
      console.error('Error sending private message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('messages:mark-read', async (data) => {
    try {
      const { messageIds, userId } = data;

      await pool.query(
        `UPDATE private_messages 
         SET is_read = TRUE 
         WHERE message_id = ANY($1) AND receiver_id = $2`,
        [messageIds, userId]
      );

      // Notify sender that messages were read
      for (const msgId of messageIds) {
        const msg = await pool.query(
          'SELECT sender_id FROM private_messages WHERE message_id = $1',
          [msgId]
        );
        
        if (msg.rows.length > 0) {
          const senderSocketId = userSockets.get(msg.rows[0].sender_id);
          if (senderSocketId) {
            io.to(senderSocketId).emit('messages:read', { messageIds });
          }
        }
      }

    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  // Edit message
  socket.on('message:edit', async (data) => {
    try {
      const { messageId, messageType, newMessage, userId } = data; // messageType: 'group' or 'private'

      if (messageType === 'group') {
        const result = await pool.query(
          `UPDATE group_messages 
           SET message = $1, is_edited = TRUE, updated_at = CURRENT_TIMESTAMP
           WHERE message_id = $2 AND sender_id = $3
           RETURNING message_id, activity_id, sender_id, message, is_edited, updated_at`,
          [newMessage, messageId, userId]
        );

        if (result.rows.length > 0) {
          const updatedMessage = result.rows[0];
          io.to(`activity:${updatedMessage.activity_id}`).emit('message:group:edited', updatedMessage);
        }
      } else {
        const result = await pool.query(
          `UPDATE private_messages 
           SET message = $1, is_edited = TRUE, updated_at = CURRENT_TIMESTAMP
           WHERE message_id = $2 AND sender_id = $3
           RETURNING message_id, sender_id, receiver_id, message, is_edited, updated_at`,
          [newMessage, messageId, userId]
        );

        if (result.rows.length > 0) {
          const updatedMessage = result.rows[0];
          // Get chat_id
          const chatResult = await pool.query(
            `SELECT chat_id FROM private_chat 
             WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
            [updatedMessage.sender_id, updatedMessage.receiver_id]
          );
          
          if (chatResult.rows.length > 0) {
            io.to(`private:${chatResult.rows[0].chat_id}`).emit('message:private:edited', updatedMessage);
          }
        }
      }

    } catch (error) {
      console.error('Error editing message:', error);
    }
  });

  // Typing indicator
  socket.on('typing:start', (data) => {
    const { type, id, userId } = data; // type: 'activity' or 'private', id: activityId or chatId
    
    if (type === 'activity') {
      socket.to(`activity:${id}`).emit('typing:start', { activityId: id, userId });
    } else {
      socket.to(`private:${id}`).emit('typing:start', { chatId: id, userId });
    }
  });

  socket.on('typing:stop', (data) => {
    const { type, id, userId } = data;
    
    if (type === 'activity') {
      socket.to(`activity:${id}`).emit('typing:stop', { activityId: id, userId });
    } else {
      socket.to(`private:${id}`).emit('typing:stop', { chatId: id, userId });
    }
  });


    socket.on('disconnect', () => {
    if (socket.userId) {
      userSockets.delete(socket.userId);
      console.log(`User ${socket.userId} disconnected`);
    }
    console.log('Socket disconnected:', socket.id);
  });
})
app.use(cors());
app.use(express.json());
app.use(logger);


app.get('/api/activities/:activityId/messages', async (req, res) => {
  try {
    const { activityId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT 
        gm.message_id,
        gm.activity_id,
        gm.sender_id,
        gm.message,
        gm.is_edited,
        gm.create_at,
        gm.updated_at,
        u.username,
        u.avatar_url
       FROM group_messages gm
       JOIN users u ON gm.sender_id = u.user_id
       WHERE gm.activity_id = $1
       ORDER BY gm.create_at DESC
       LIMIT $2 OFFSET $3`,
      [activityId, limit, offset]
    );

    res.json({
      messages: result.rows.reverse(), // Reverse to get chronological order
      total: result.rowCount
    });

  } catch (error) {
    console.error('Error fetching group messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/chats/private', async (req, res) => {
  try {
    const { user1Id, user2Id } = req.body;

    // Check if chat already exists
    let result = await pool.query(
      `SELECT chat_id, user1_id, user2_id, last_message_id, create_at, updated_at
       FROM private_chat
       WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
      [user1Id, user2Id]
    );

    if (result.rows.length > 0) {
      return res.json(result.rows[0]);
    }

    // Create new chat
    result = await pool.query(
      `INSERT INTO private_chat (user1_id, user2_id, create_at, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING chat_id, user1_id, user2_id, last_message_id, create_at, updated_at`,
      [user1Id, user2Id]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Error creating private chat:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

// Get private chat messages
app.get('/api/chats/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Get chat info to verify users
    const chatResult = await pool.query(
      'SELECT user1_id, user2_id FROM private_chat WHERE chat_id = $1',
      [chatId]
    );

    if (chatResult.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const { user1_id, user2_id } = chatResult.rows[0];

    const result = await pool.query(
      `SELECT 
        pm.message_id,
        pm.sender_id,
        pm.receiver_id,
        pm.message,
        pm.is_read,
        pm.is_edited,
        pm.create_at,
        pm.updated_at,
        u.username,
        u.profile_image
       FROM private_messages pm
       JOIN users u ON pm.sender_id = u.user_id
       WHERE (pm.sender_id = $1 AND pm.receiver_id = $2) 
          OR (pm.sender_id = $2 AND pm.receiver_id = $1)
       ORDER BY pm.create_at DESC
       LIMIT $3 OFFSET $4`,
      [user1_id, user2_id, limit, offset]
    );

    res.json({
      messages: result.rows.reverse(),
      total: result.rowCount
    });

  } catch (error) {
    console.error('Error fetching private messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get all user's private chats
app.get('/api/users/:userId/chats', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT 
        pc.chat_id,
        pc.user1_id,
        pc.user2_id,
        pc.last_message_id,
        pc.updated_at,
        CASE 
          WHEN pc.user1_id = $1 THEN u2.username
          ELSE u1.username
        END as other_username,
        CASE 
          WHEN pc.user1_id = $1 THEN u2.profile_image
          ELSE u1.profile_image
        END as other_profile_image,
        CASE 
          WHEN pc.user1_id = $1 THEN pc.user2_id
          ELSE pc.user1_id
        END as other_user_id,
        pm.message as last_message,
        pm.create_at as last_message_time,
        pm.sender_id as last_message_sender_id,
        (SELECT COUNT(*) FROM private_messages 
         WHERE receiver_id = $1 
         AND is_read = FALSE 
         AND ((sender_id = pc.user1_id AND receiver_id = pc.user2_id) 
              OR (sender_id = pc.user2_id AND receiver_id = pc.user1_id))
        ) as unread_count
       FROM private_chat pc
       LEFT JOIN users u1 ON pc.user1_id = u1.user_id
       LEFT JOIN users u2 ON pc.user2_id = u2.user_id
       LEFT JOIN private_messages pm ON pc.last_message_id = pm.message_id
       WHERE pc.user1_id = $1 OR pc.user2_id = $1
       ORDER BY pc.updated_at DESC`,
      [userId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching user chats:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
app.use('/api/auth', authRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/profile', userRoutes)

app.use(errorHandler);



(async () => {
    try {
        await createTables();
        server.listen(3000, '0.0.0.0', () => {
            console.log(`Server running on http://localhost:3000`);
        });
    } catch (err) {
        console.error('Error starting server:', err);
    }
})();
