import { sql } from '../config/db.js';

function mapRow(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    assignmentName: row.assignment_name,
    college: row.college,
    status: row.status,
    type: row.type,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildWhere(conditions, startIdx = 1) {
  const clauses = [];
  const params = [];
  let idx = startIdx;
  for (const [col, val] of Object.entries(conditions)) {
    if (val === undefined) continue;
    clauses.push(`${col} = $${idx++}`);
    params.push(val);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

const Batch = {
  async findOne(conditions) {
    const { where, params } = buildWhere(conditions);
    const rows = await sql.query(`SELECT * FROM batches ${where} LIMIT 1`, params);
    return mapRow(rows[0]);
  },

  async find(conditions = {}, options = {}) {
    const { where, params } = buildWhere(conditions);
    const orderBy = options.sort || 'college ASC, name ASC';
    const rows = await sql.query(`SELECT * FROM batches ${where} ORDER BY ${orderBy}`, params);
    return rows.map(mapRow);
  },

  async findById(id) {
    const rows = await sql.query('SELECT * FROM batches WHERE id = $1', [id]);
    return mapRow(rows[0]);
  },

  async create(data) {
    const rows = await sql.query(
      `INSERT INTO batches (name, assignment_name, college, status, type, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        data.name,
        data.assignmentName || data.assignment_name || '',
        data.college,
        data.status || 'active',
        data.type || 'technical',
        data.startDate || data.start_date || null,
        data.endDate || data.end_date || null,
      ]
    );
    return mapRow(rows[0]);
  },

  async findByIdAndUpdate(id, data, _opts = {}) {
    const sets = [];
    const params = [];
    let idx = 1;
    const fieldMap = {
      name: 'name', assignmentName: 'assignment_name', college: 'college',
      status: 'status', type: 'type',
      startDate: 'start_date', endDate: 'end_date',
    };
    for (const [k, col] of Object.entries(fieldMap)) {
      if (data[k] !== undefined) {
        sets.push(`${col} = $${idx++}`);
        params.push(data[k]);
      }
    }
    if (!sets.length) return this.findById(id);
    sets.push(`updated_at = NOW()`);
    params.push(id);
    const rows = await sql.query(
      `UPDATE batches SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return mapRow(rows[0]);
  },

  async findByIdAndDelete(id) {
    const rows = await sql.query('DELETE FROM batches WHERE id = $1 RETURNING *', [id]);
    return mapRow(rows[0]);
  },

  async countDocuments(conditions = {}) {
    const { where, params } = buildWhere(conditions);
    const rows = await sql.query(`SELECT COUNT(*) FROM batches ${where}`, params);
    return parseInt(rows[0].count, 10);
  },
};

export default Batch;
