import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host:     process.env.MYSQL_HOST     || 'localhost',
  port:     parseInt(process.env.MYSQL_PORT || '3306'),
  user:     process.env.MYSQL_USER     || 'root',
  password: process.env.MYSQL_PASSWORD || 'admin@123',
  database: process.env.MYSQL_DATABASE || 'trainer_management',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+00:00',
});

export async function initMySQLTables() {
  const conn = await pool.getConnection();
  try {
    // Tracks which QR sessions were generated each day per batch
    await conn.query(`
      CREATE TABLE IF NOT EXISTS qr_sessions_log (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        session_key  VARCHAR(20)  NOT NULL,
        session_label VARCHAR(50),
        session_date DATE         NOT NULL,
        batch_name   VARCHAR(100),
        college      VARCHAR(100),
        generated_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_session (session_key, session_date, batch_name)
      )
    `);

    // One row per student per session — no duplicate scans
    await conn.query(`
      CREATE TABLE IF NOT EXISTS student_attendance (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        usn           VARCHAR(20)   NOT NULL,
        student_name  VARCHAR(100)  NOT NULL,
        session_key   VARCHAR(20)   NOT NULL,
        session_label VARCHAR(50),
        session_date  DATE          NOT NULL,
        batch_name    VARCHAR(100),
        college       VARCHAR(100),
        latitude      DECIMAL(10,8),
        longitude     DECIMAL(11,8),
        submitted_at  DATETIME      DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_attendance (usn, session_key, session_date)
      )
    `);

    console.log('[MySQL] Tables ready');
  } catch (err) {
    console.error('[MySQL] Table init error:', err.message);
  } finally {
    conn.release();
  }
}

export default pool;
