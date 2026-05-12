import { sql } from '../config/db.js';

function mapRow(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    token: row.token,
    session: row.session,
    batchId: row.batch_id,
    batchName: row.batch_name,
    college: row.college,
    date: row.date,
    expiresAt: row.expires_at,
    submitUntil: row.submit_until,
    usedIps: row.used_ips || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SessionToken = {
  async create(data) {
    const rows = await sql.query(
      `INSERT INTO session_tokens
         (session, batch_id, batch_name, college, date, expires_at, submit_until)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        data.session,
        data.batchId || null,
        data.batchName,
        data.college || '',
        data.date,
        data.expiresAt,
        data.submitUntil,
      ]
    );
    return mapRow(rows[0]);
  },

  async findOne(conditions = {}) {
    if (conditions.token) {
      const rows = await sql.query(
        'SELECT * FROM session_tokens WHERE token = $1 LIMIT 1',
        [conditions.token]
      );
      return mapRow(rows[0]);
    }
    return null;
  },

  async addUsedIp(id, ip) {
    await sql.query(
      'UPDATE session_tokens SET used_ips = array_append(used_ips, $1), updated_at = NOW() WHERE id = $2',
      [ip, id]
    );
  },

  async updateOne(conditions, updates) {
    const id = conditions._id || conditions.id;
    if (updates.$push?.usedIps) {
      await this.addUsedIp(id, updates.$push.usedIps);
    }
  },
};

export default SessionToken;
