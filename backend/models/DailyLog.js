import { sql } from '../config/db.js';

function mapRow(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    date: row.date,
    batchId: row.batch_id,
    batchName: row.batch_name,
    college: row.college,
    sessions: row.sessions || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function batchWhere(date, batchId) {
  return batchId
    ? `date = $1 AND batch_id = $2`
    : `date = $1 AND batch_id IS NULL`;
}

function batchParams(date, batchId) {
  return batchId ? [date, batchId] : [date];
}

const DailyLog = {
  async findOne(conditions = {}) {
    const { date, batchId } = conditions;
    const where = batchWhere(date, batchId);
    const params = batchParams(date, batchId);
    const rows = await sql.query(
      `SELECT * FROM daily_logs WHERE ${where} LIMIT 1`,
      params
    );
    return mapRow(rows[0]);
  },

  async findSession(date, batchId, session) {
    // Check if a specific session exists in the JSONB sessions array
    const where = batchWhere(date, batchId);
    const params = batchParams(date, batchId);
    params.push(JSON.stringify([{ session }]));
    const paramIdx = params.length;
    const rows = await sql.query(
      `SELECT id FROM daily_logs WHERE ${where} AND sessions @> $${paramIdx}::jsonb LIMIT 1`,
      params
    );
    return rows.length > 0 ? rows[0] : null;
  },

  async upsert(date, batchId, batchName, college, sessionEntry) {
    const existing = await this.findOne({ date, batchId });
    if (existing) {
      const newSessions = [...existing.sessions, sessionEntry];
      const rows = await sql.query(
        `UPDATE daily_logs SET sessions = $1::jsonb, updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [JSON.stringify(newSessions), existing.id]
      );
      return mapRow(rows[0]);
    } else {
      const rows = await sql.query(
        `INSERT INTO daily_logs (date, batch_id, batch_name, college, sessions)
         VALUES ($1,$2,$3,$4,$5::jsonb) RETURNING *`,
        [date, batchId || null, batchName, college || '', JSON.stringify([sessionEntry])]
      );
      return mapRow(rows[0]);
    }
  },

  async find(options = {}) {
    const rows = await sql.query(
      `SELECT * FROM daily_logs ORDER BY date DESC`
    );
    return rows.map(mapRow);
  },
};

export default DailyLog;
