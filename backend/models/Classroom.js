import { sql } from '../config/db.js';

function mapRow(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    college: row.college,
    assignmentName: row.assignment_name,
    name: row.name,
    batch: row.batch_id
      ? { _id: row.batch_id, id: row.batch_id, name: row.batch_name, college: row.batch_college }
      : null,
    status: row.status,
    capacity: row.capacity,
    startDate: row.start_date,
    endDate: row.end_date,
    description: row.description,
    adminRemark: row.admin_remark,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const JOIN = `LEFT JOIN batches b ON b.id = c.batch_id`;

const Classroom = {
  async find(conditions = {}) {
    const params = [];
    const clauses = [];
    let idx = 1;
    if (conditions.status !== undefined) {
      clauses.push(`c.status = $${idx++}`);
      params.push(conditions.status);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await sql.query(
      `SELECT c.*, b.name AS batch_name, b.college AS batch_college
       FROM classrooms c ${JOIN} ${where}
       ORDER BY c.college, c.assignment_name, c.name`,
      params
    );
    return rows.map(mapRow);
  },

  async findById(id) {
    const rows = await sql.query(
      `SELECT c.*, b.name AS batch_name, b.college AS batch_college
       FROM classrooms c ${JOIN} WHERE c.id = $1`,
      [id]
    );
    return mapRow(rows[0]);
  },

  async create(data) {
    const rows = await sql.query(
      `INSERT INTO classrooms
         (college, assignment_name, name, batch_id, status, capacity, start_date, end_date, description, admin_remark)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [
        data.college, data.assignmentName || null, data.name,
        data.batch || null,
        data.status || 'available',
        data.capacity || 30,
        data.startDate || null, data.endDate || null,
        data.description || null, data.adminRemark || null,
      ]
    );
    return this.findById(rows[0].id);
  },

  async findByIdAndUpdate(id, data) {
    const fieldMap = {
      college: 'college', assignmentName: 'assignment_name', name: 'name',
      batch: 'batch_id', status: 'status', capacity: 'capacity',
      startDate: 'start_date', endDate: 'end_date',
      description: 'description', adminRemark: 'admin_remark',
    };
    const sets = [];
    const params = [];
    let idx = 1;
    for (const [k, col] of Object.entries(fieldMap)) {
      if (data[k] !== undefined) {
        sets.push(`${col} = $${idx++}`);
        params.push(data[k] === '' ? null : data[k]);
      }
    }
    if (!sets.length) return this.findById(id);
    sets.push('updated_at = NOW()');
    params.push(id);
    await sql.query(`UPDATE classrooms SET ${sets.join(', ')} WHERE id = $${idx}`, params);
    return this.findById(id);
  },

  async findByIdAndDelete(id) {
    const existing = await this.findById(id);
    if (!existing) return null;
    await sql.query('DELETE FROM classrooms WHERE id = $1', [id]);
    return existing;
  },
};

export default Classroom;
