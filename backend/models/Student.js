import { sql } from '../config/db.js';

function mapRow(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    usn: row.usn,
    batch: row.batch_id
      ? { _id: row.batch_id, id: row.batch_id, name: row.batch_name }
      : null,
    college: row.college,
    email: row.email,
    phone: row.phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const Student = {
  async findOne(conditions = {}) {
    const { usn } = conditions;
    if (usn) {
      const rows = await sql.query(
        `SELECT s.*, b.name AS batch_name FROM students s
         LEFT JOIN batches b ON b.id = s.batch_id
         WHERE s.usn = $1 LIMIT 1`,
        [usn]
      );
      return mapRow(rows[0]);
    }
    return null;
  },

  async find() {
    const rows = await sql.query(
      `SELECT s.*, b.name AS batch_name FROM students s
       LEFT JOIN batches b ON b.id = s.batch_id
       ORDER BY s.name`
    );
    return rows.map(mapRow);
  },

  async create(data) {
    const rows = await sql.query(
      `INSERT INTO students (name, usn, batch_id, college, email, phone)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [data.name, data.usn, data.batch || data.batch_id || null, data.college, data.email || null, data.phone || null]
    );
    // re-fetch with batch join
    return this.findByUsn(rows[0].usn);
  },

  async findByUsn(usn) {
    const rows = await sql.query(
      `SELECT s.*, b.name AS batch_name FROM students s
       LEFT JOIN batches b ON b.id = s.batch_id
       WHERE s.usn = $1`,
      [usn]
    );
    return mapRow(rows[0]);
  },
};

export default Student;
