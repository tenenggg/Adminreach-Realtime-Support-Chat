const pool = require('../config/db');                   // imports the database connection pool


// Fetches all users with their last message timestamp and unread message count
const getAllUsers = async (adminId) => {
    const result = await pool.query(`
    SELECT 
        u.id, 
        u.username, 
        u.role,
        (SELECT MAX(created_at) FROM messages WHERE sender_id = u.id OR receiver_id = u.id) as last_message_time,
        (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND receiver_id = $1 AND is_read = false) as unread_count
    FROM users u
    WHERE u.role = 'user'
    ORDER BY last_message_time DESC NULLS LAST, u.id ASC
  `, [adminId]);                                          // parameterized query to avoid SQL injection
    return result.rows;                                   // returns the list of users
};





// Marks all unread messages from a specific user to an admin as "read"
const markMessagesAsRead = async (userId, adminId) => {
    await pool.query(                                     // executes update query in the DB
        'UPDATE messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false',
        [userId, adminId]                                 // uses parameters for security
    );
};





// Fetches the entire message history between a specific user and the admin
const getConversationForUser = async (userId) => {
    const result = await pool.query(`
    SELECT m.id, m.sender_id, m.receiver_id, m.content, m.created_at,
           s.username as sender_name
    FROM messages m
    JOIN users s ON m.sender_id = s.id
    WHERE m.sender_id = $1 OR m.receiver_id = $1
    ORDER BY m.created_at ASC
  `, [userId]);                                          // ordered by time to keep the chat chronological
    return result.rows;                                   // returns the conversation entries
};





// Saves a new message to the database
const saveMessage = async (senderId, receiverId, content) => {
    const result = await pool.query(                      // inserts the new message record
        'INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING id, created_at',
        [senderId, receiverId, content]                   // secures inputs against injection
    );
    return result.rows[0];                                // returns the ID and timestamp of the saved message
};


// Finds a single message by its ID
const getMessageById = async (messageId) => {
    const result = await pool.query(                      // executes selection query
        'SELECT * FROM messages WHERE id = $1',
        [messageId]                                       // parameterized ID
    );
    return result.rows[0];                                // returns the message object or undefined
};





// Removes a message from the database permanently
const deleteMessage = async (messageId) => {
    await pool.query(                                     // executes deletion query
        'DELETE FROM messages WHERE id = $1',
        [messageId]                                       // parameterized ID
    );
};





module.exports = {
    getAllUsers,
    markMessagesAsRead,
    getConversationForUser,
    saveMessage,
    getMessageById,                                       // exports new helper
    deleteMessage,                                        // exports new helper
};
