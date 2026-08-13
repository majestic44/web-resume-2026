import mysql from 'mysql2/promise';

let pool;

export function getDatabasePool() {
  if (pool) {
    return pool;
  }

  pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_DATABASE || 'web_resume_2026',
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    namedPlaceholders: true,
    charset: process.env.DB_CHARSET || 'utf8mb4'
  });

  return pool;
}

