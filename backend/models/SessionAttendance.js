import { sql } from '../config/db.js';

function mapRow(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    studentName: row.student_name,
    usn: row.usn,
    batchId: row.batch_id,
    batchName: row.batch_name,
    college: row.college,
    session: row.session,
    latitude: row.latitude,
    longitude: row.longitude,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SessionAttendance = {
  async create(data) {
    const rows = await sql.query(
      `INSERT INTO session_attendance
         (student_name, usn, batch_id, batch_name, college, session, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        data.studentName,
        data.usn,
        data.batchId || null,
        data.batchName,
        data.college,
        data.session,
        data.latitude ?? null,
        data.longitude ?? null,
      ]
    );
    return mapRow(rows[0]);
  },
};

export default SessionAttendance;
