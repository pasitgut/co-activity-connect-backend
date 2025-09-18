import pool from "./config/db.js";

export async function createTables() {
  const createTablesSQL = `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS users (
      user_id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
      email text UNIQUE NOT NULL,
      username text NOT NULL,
      password text NOT NULL,
      create_at timestamptz DEFAULT now ()
    );

    CREATE TABLE IF NOT EXISTS groups (
      group_id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
      owner_id uuid REFERENCES users (user_id) ON DELETE SET NULL,
      group_name text UNIQUE NOT NULL,
      description text,
      cover_url text,
      type text,
      tags text[],
      is_private boolean DEFAULT false,
      max_members integer DEFAULT 100,
      create_at timestamptz DEFAULT now(),
      update_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_member_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id uuid REFERENCES groups(group_id) ON DELETE CASCADE,
      user_id uuid REFERENCES users(user_id) ON DELETE CASCADE,
      role text NOT NULL DEFAULT 'member',
      joined_at timestamptz DEFAULT now(),
      is_approved boolean DEFAULT true
    );

    CREATE UNIQUE INDEX IF NOT EXISTS ux_group_user ON group_members (group_id, user_id);

    CREATE TABLE IF NOT EXISTS chat_messages (
      message_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id uuid REFERENCES groups(group_id) ON DELETE CASCADE,
      sender_id uuid REFERENCES users(user_id),
      content text,
      attachments jsonb,
      pinned boolean DEFAULT false,
      create_at timestamptz DEFAULT now()
    );
  `;

  try {
    await pool.query(createTablesSQL);
    console.log('Tables created or already exist.');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}
