import { sql } from '../config/db.js';

function mapRow(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    qrToken: row.qr_token,
    batchId: row.batch_id,
    classroomId: row.classroom_id,
    generatedAt: row.generated_at,
    expiresAt: row.expires_at,
    status: row.status,
    trainerId: row.trainer_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const QRSession = {
  async create(data) {
    const rows = await sql.query(
      `INSERT INTO qr_sessions (qr_token, batch_id, classroom_id, expires_at, trainer_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [data.qrToken, data.batchId, data.classroomId || null, data.expiresAt, data.trainerId || null]
    );
    return mapRow(rows[0]);
  },

  async findOne(conditions = {}) {
    if (conditions.qrToken) {
      const rows = await sql.query('SELECT * FROM qr_sessions WHERE qr_token = $1 LIMIT 1', [conditions.qrToken]);
      return mapRow(rows[0]);
    }
    return null;
  },

  async updateOne(conditions, updates) {
    const id = conditions._id || conditions.id;
    if (updates.status) {
      await sql.query('UPDATE qr_sessions SET status = $1, updated_at = NOW() WHERE id = $2', [updates.status, id]);
    }
  },
};

export default QRSession;
