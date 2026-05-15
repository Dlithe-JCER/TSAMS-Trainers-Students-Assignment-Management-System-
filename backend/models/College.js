import { sql } from '../config/db.js';

function mapRow(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    code: row.code,
    department: row.department,
    location: row.location,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const College = {
  async findAll() {
    const rows = await sql.query('SELECT * FROM colleges ORDER BY code ASC');
    return rows.map(mapRow);
  },

  async findById(id) {
    const rows = await sql.query('SELECT * FROM colleges WHERE id = $1', [id]);
    return mapRow(rows[0]);
  },

  async findOne(conditions = {}) {
    const params = [];
    const clauses = [];
    let idx = 1;
    for (const [k, v] of Object.entries(conditions)) {
      clauses.push(`${k} = $${idx++}`);
      params.push(v);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await sql.query(`SELECT * FROM colleges ${where} LIMIT 1`, params);
    return mapRow(rows[0]);
  },

  async create(data) {
    const rows = await sql.query(
      `INSERT INTO colleges (name, code, department, location, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.name, data.code, data.department || null, data.location || null, data.isActive ?? true]
    );
    return mapRow(rows[0]);
  },

  async findByIdAndUpdate(id, data) {
    const sets = [];
    const params = [];
    let idx = 1;
    if (data.name !== undefined) { sets.push(`name = $${idx++}`); params.push(data.name); }
    if (data.code !== undefined) { sets.push(`code = $${idx++}`); params.push(data.code); }
    if (data.department !== undefined) { sets.push(`department = $${idx++}`); params.push(data.department); }
    if (data.location !== undefined) { sets.push(`location = $${idx++}`); params.push(data.location); }
    if (data.isActive !== undefined) { sets.push(`is_active = $${idx++}`); params.push(data.isActive); }
    if (!sets.length) return this.findById(id);
    sets.push('updated_at = NOW()');
    params.push(id);
    const rows = await sql.query(
      `UPDATE colleges SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return mapRow(rows[0]);
  },

  async findByIdAndDelete(id) {
    const rows = await sql.query('DELETE FROM colleges WHERE id = $1 RETURNING *', [id]);
    return mapRow(rows[0]);
  },
};

export default College;
