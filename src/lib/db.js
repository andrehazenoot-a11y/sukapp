import mysql from 'mysql2/promise';

let pool;

export async function getDbConnection() {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST || '192.168.1.70',
            port: parseInt(process.env.DB_PORT || '3306', 10),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'schildersapp',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });
    }
    return pool;
}
