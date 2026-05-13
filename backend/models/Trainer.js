import { sql } from '../config/db.js';

function mapRow(row, { excludePassword = false } = {}) {
  if (!row) return null;
  const obj = {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    college: row.college,
    allottedCollege: row.allotted_college,
    allottedProgrammingLanguage: row.allotted_programming_language,
    allottedLevel: row.allotted_level,
    assignmentName: row.assignment_name,
    allottedBatch: row.allotted_batch_id,
    topicCoverage: row.topic_coverage,
    adminRemark: row.admin_remark,
    assignedTocId: row.assigned_toc_id,
    username: row.username,
    verified: row.verified,
    isActive: row.is_active,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (!excludePassword) obj.password = row.password;

  // If batch was joined
  if (row.batch_name !== undefined) {
    obj.allottedBatch = row.allotted_batch_id
      ? { _id: row.allotted_batch_id, id: row.allotted_batch_id, name: row.batch_name, college: row.batch_college }
      : null;
  }
  return obj;
}

const Trainer = {
  async findById(id, { excludePassword = false } = {}) {
    if (!id) return null;
    const rows = await sql.query('SELECT * FROM trainers WHERE id = $1', [id]);
    return mapRow(rows[0], { excludePassword });
  },

  // conditions: plain field=value pairs (no $or)
  async findOne(conditions = {}) {
    const keys = Object.keys(conditions).filter(k => k !== '$or');
    const params = [];
    const clauses = [];
    let idx = 1;

    if (conditions.$or) {
      const orClauses = [];
      for (const cond of conditions.$or) {
        for (const [k, v] of Object.entries(cond)) {
          const col = camelToCol(k);
          orClauses.push(`${col} = $${idx++}`);
          params.push(v);
        }
      }
      if (orClauses.length) clauses.push(`(${orClauses.join(' OR ')})`);
    }

    for (const k of keys) {
      clauses.push(`${camelToCol(k)} = $${idx++}`);
      params.push(conditions[k]);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await sql.query(`SELECT * FROM trainers ${where} LIMIT 1`, params);
    return mapRow(rows[0]);
  },

  async find(conditions = {}, { excludePassword = false, withBatch = false } = {}) {
    const params = [];
    const clauses = [];
    let idx = 1;

    if (conditions.$or) {
      const orClauses = [];
      for (const cond of conditions.$or) {
        for (const [k, v] of Object.entries(cond)) {
          orClauses.push(`t.${camelToCol(k)} = $${idx++}`);
          params.push(v);
        }
      }
      if (orClauses.length) clauses.push(`(${orClauses.join(' OR ')})`);
    }

    for (const [k, v] of Object.entries(conditions)) {
      if (k === '$or' || v === undefined) continue;
      clauses.push(`t.${camelToCol(k)} = $${idx++}`);
      params.push(v);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    let query;
    if (withBatch) {
      query = `SELECT t.*, b.name AS batch_name, b.college AS batch_college
               FROM trainers t
               LEFT JOIN batches b ON b.id = t.allotted_batch_id
               ${where} ORDER BY t.allotted_college ASC, t.name ASC`;
    } else {
      query = `SELECT * FROM trainers t ${where} ORDER BY allotted_college ASC, name ASC`;
    }

    const rows = await sql.query(query, params);
    return rows.map(r => mapRow(r, { excludePassword }));
  },

  async create(data) {
    const rows = await sql.query(
      `INSERT INTO trainers
         (name, email, phone, college, allotted_college, allotted_programming_language,
          allotted_level, assignment_name, allotted_batch_id, topic_coverage, admin_remark,
          assigned_toc_id, username, password, verified, is_active, role)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [
        data.name,
        data.email || null,
        data.phone,
        data.college || null,
        data.allottedCollege || null,
        data.allottedProgrammingLanguage || null,
        data.allottedLevel || null,
        data.assignmentName || null,
        data.allottedBatch || null,
        data.topicCoverage || null,
        data.adminRemark || null,
        data.assignedTocId || null,
        data.username || null,
        data.password || null,
        data.verified ?? false,
        data.isActive ?? true,
        data.role || 'trainer',
      ]
    );
    return mapRow(rows[0]);
  },

  async findByIdAndUpdate(id, data) {
    const fieldMap = {
      name: 'name', email: 'email', phone: 'phone', college: 'college',
      allottedCollege: 'allotted_college',
      allottedProgrammingLanguage: 'allotted_programming_language',
      allottedLevel: 'allotted_level', assignmentName: 'assignment_name',
      allottedBatch: 'allotted_batch_id', topicCoverage: 'topic_coverage',
      adminRemark: 'admin_remark', assignedTocId: 'assigned_toc_id',
      username: 'username', password: 'password',
      verified: 'verified', isActive: 'is_active', role: 'role',
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
      `UPDATE trainers SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return mapRow(rows[0]);
  },

  async findByIdAndDelete(id) {
    const rows = await sql.query('DELETE FROM trainers WHERE id = $1 RETURNING *', [id]);
    return mapRow(rows[0]);
  },

  async countDocuments(conditions = {}) {
    const params = [];
    const clauses = [];
    let idx = 1;
    for (const [k, v] of Object.entries(conditions)) {
      if (v === undefined) continue;
      clauses.push(`${camelToCol(k)} = $${idx++}`);
      params.push(v);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await sql.query(`SELECT COUNT(*) FROM trainers ${where}`, params);
    return parseInt(rows[0].count, 10);
  },

  async distinct(field, conditions = {}) {
    const col = camelToCol(field);
    const params = [];
    const clauses = [];
    let idx = 1;
    for (const [k, v] of Object.entries(conditions)) {
      if (v === undefined || v === null) continue;
      clauses.push(`${camelToCol(k)} = $${idx++}`);
      params.push(v);
    }
    clauses.push(`${col} IS NOT NULL`);
    clauses.push(`${col} != ''`);
    const where = `WHERE ${clauses.join(' AND ')}`;
    const rows = await sql.query(`SELECT DISTINCT ${col} FROM trainers ${where} ORDER BY ${col}`, params);
    return rows.map(r => r[col]).filter(Boolean);
  },
};

function camelToCol(key) {
  const map = {
    name: 'name', email: 'email', phone: 'phone', college: 'college',
    allottedCollege: 'allotted_college',
    allottedProgrammingLanguage: 'allotted_programming_language',
    allottedLevel: 'allotted_level', assignmentName: 'assignment_name',
    allottedBatch: 'allotted_batch_id', topicCoverage: 'topic_coverage',
    adminRemark: 'admin_remark', assignedTocId: 'assigned_toc_id',
    username: 'username', password: 'password',
    verified: 'verified', isActive: 'is_active', role: 'role',
    id: 'id',
  };
  return map[key] || key;
}

export default Trainer;
