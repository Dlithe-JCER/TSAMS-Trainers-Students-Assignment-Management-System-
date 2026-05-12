import { sql } from '../config/db.js';

function mapRow(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    studentId: row.student_id,
    qrSessionId: row.qr_session_id,
    studentName: row.student_name,
    usn: row.usn,
    batchName: row.batch_name,
    college: row.college,
    latitude: row.latitude,
    longitude: row.longitude,
    attendanceTimestamp: row.attendance_timestamp,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const Attendance = {
  async create(data) {
    const rows = await sql.query(
      `INSERT INTO attendance
         (student_id, qr_session_id, student_name, usn, batch_name, college, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        data.studentId || null,
        data.qrSessionId,
        data.studentName,
        data.usn,
        data.batchName,
        data.college,
        data.latitude ?? null,
        data.longitude ?? null,
      ]
    );
    return mapRow(rows[0]);
  },

  async findOne(conditions = {}) {
    if (conditions.qrSessionId && conditions.usn) {
      const rows = await sql.query(
        'SELECT * FROM attendance WHERE qr_session_id = $1 AND usn = $2 LIMIT 1',
        [conditions.qrSessionId, conditions.usn]
      );
      return mapRow(rows[0]);
    }
    return null;
  },

  async find(conditions = {}) {
    if (conditions.qrSessionId) {
      const rows = await sql.query(
        'SELECT * FROM attendance WHERE qr_session_id = $1 ORDER BY created_at DESC',
        [conditions.qrSessionId]
      );
      return rows.map(mapRow);
    }
    return [];
  },
};

export default Attendance;
