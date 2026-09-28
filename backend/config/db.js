const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool to the shared MySQL database
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'matira_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test the connection on startup
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log(`[Database] Successfully connected to MySQL database: ${process.env.DB_NAME || 'matira_db'}`);
        connection.release();
    } catch (error) {
        console.error('[Database] Connection failed:', error.message);
    }
})();

module.exports = pool;
