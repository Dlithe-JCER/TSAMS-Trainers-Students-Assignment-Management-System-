import { sql } from '../config/db.js';

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    studentName: row.student_name,
    usn: row.usn,
    cleanKey: row.clean_key,
    date: row.date,
    time: row.time,
    latitude: row.latitude,
    longitude: row.longitude,
    session: row.session,
    batchName: row.batch_name,
    college: row.college,
    createdAt: row.created_at,
  };
}

const AttendanceSummary = {
  async create(data) {
    const rows = await sql.query(
      `INSERT INTO attendance_summary
         (student_name, usn, clean_key, date, time, latitude, longitude, session, batch_name, college)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        data.studentName,
        data.usn,
        data.cleanKey,
        data.date,
        data.time,
        data.latitude ?? null,
        data.longitude ?? null,
        data.session || null,
        data.batchName || null,
        data.college || null,
      ]
    );
    return mapRow(rows[0]);
  },

  async find(filters = {}) {
    let query = `SELECT * FROM attendance_summary`;
    const params = [];
    const conditions = [];

    if (filters.college) {
      params.push(filters.college);
      conditions.push(`college = $${params.length}`);
    }
    if (filters.date) {
      params.push(filters.date);
      conditions.push(`date = $${params.length}`);
    }

    if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
    query += ` ORDER BY date DESC, created_at DESC`;

    const rows = await sql.query(query, params);
    return rows.map(mapRow);
  },
};

export default AttendanceSummary;
