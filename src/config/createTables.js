import pool from "./db.js";

export async function createTables() {
  const createTablesSQL = `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    year_level INT,
    faculty VARCHAR(100),
    major VARCHAR(100),
    avatar_url TEXT DEFAULT 'https://static.vecteezy.com/system/resources/thumbnails/009/292/244/small_2x/default-avatar-icon-of-social-media-user-vector.jpg',
    bio TEXT DEFAULT '',
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activities (
    activity_id SERIAL PRIMARY KEY,
    creator_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    max_member INT DEFAULT 100,
    current_member INT DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    type VARCHAR(50),
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users (user_id)
);

-- DROP TYPE IF EXISTS status_num CASCADE;

-- DROP TYPE IF EXISTS role_num CASCADE;

CREATE TYPE role_num as enum ('admin', 'member');

CREATE TYPE status_num as enum ('pending', 'accepted', 'rejected');

CREATE TABLE IF NOT EXISTS activity_members (
    participant_id SERIAL PRIMARY KEY,
    activity_id INT NOT NULL,
    user_id UUID NOT NULL,
    role role_num DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status status_num DEFAULT 'accepted',
    FOREIGN KEY (activity_id) REFERENCES activities (activity_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    UNIQUE (activity_id, user_id)
);

CREATE TABLE IF NOT EXISTS friendships (
    friendship_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    friend_id UUID NOT NUll,
    status status_num DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users (user_id) ON DELETE CASCADE,
    UNIQUE (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS group_messages (
    message_id SERIAL PRIMARY KEY,
    activity_id INT NOT NULL,
    sender_id UUID NOT NULL,
    message TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities (activity_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS private_messages (
    message_id SERIAL PRIMARY KEY,
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS private_chat (
    chat_id SERIAL PRIMARY KEY,
    user1_id UUID NOT NULL,
    user2_id UUID NOT NULL,
    last_message_id INT,
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user1_id) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (last_message_id) REFERENCES private_messages (message_id),
    UNIQUE (user1_id, user2_id)
);
  `;

  try {
    await pool.query(createTablesSQL);
    console.log('Tables created or already exist.');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}
