import { sql } from '../config/db.js';

function mapRow(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    college: row.college,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
    adminRemark: row.admin_remark,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const Assignment = {
  async find(conditions = {}) {
    const params = [];
    const clauses = [];
    let idx = 1;
    if (conditions.isActive !== undefined) {
      clauses.push(`is_active = $${idx++}`);
      params.push(conditions.isActive);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await sql.query(
      `SELECT * FROM assignments ${where} ORDER BY college, name`,
      params
    );
    return rows.map(mapRow);
  },

  async findOne(conditions = {}) {
    const params = [];
    const clauses = [];
    let idx = 1;
    if (conditions.name !== undefined) { clauses.push(`name = $${idx++}`); params.push(conditions.name); }
    if (conditions.college !== undefined) { clauses.push(`college = $${idx++}`); params.push(conditions.college); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await sql.query(`SELECT * FROM assignments ${where} LIMIT 1`, params);
    return mapRow(rows[0]);
  },

  async findById(id) {
    const rows = await sql.query('SELECT * FROM assignments WHERE id = $1', [id]);
    return mapRow(rows[0]);
  },

  async create(data) {
    const rows = await sql.query(
      `INSERT INTO assignments (name, college, start_date, end_date, admin_remark)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [data.name, data.college, data.startDate || null, data.endDate || null, data.adminRemark || null]
    );
    return mapRow(rows[0]);
  },

  async findByIdAndUpdate(id, data) {
    const fieldMap = {
      name: 'name', college: 'college', startDate: 'start_date',
      endDate: 'end_date', isActive: 'is_active', adminRemark: 'admin_remark',
    };
    const sets = [];
    const params = [];
    let idx = 1;
    for (const [k, col] of Object.entries(fieldMap)) {
      if (data[k] !== undefined) {
        sets.push(`${col} = $${idx++}`);
        params.push(data[k]);
      }
    }
    if (!sets.length) return this.findById(id);
    sets.push('updated_at = NOW()');
    params.push(id);
    const rows = await sql.query(
      `UPDATE assignments SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return mapRow(rows[0]);
  },

  async findByIdAndDelete(id) {
    const rows = await sql.query('DELETE FROM assignments WHERE id = $1 RETURNING *', [id]);
    return mapRow(rows[0]);
  },
};

export default Assignment;
