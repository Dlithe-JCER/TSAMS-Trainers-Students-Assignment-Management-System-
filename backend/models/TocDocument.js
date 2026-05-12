import { sql } from '../config/db.js';

function mapRow(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    college: row.college,
    assignmentName: row.assignment_name,
    title: row.title,
    level: row.level,
    fileName: row.file_name,
    filePath: row.file_path,
    fileUrl: row.file_url,
    uploadedAt: row.uploaded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const TocDocument = {
  async find(conditions = {}) {
    const params = [];
    const clauses = [];
    let idx = 1;

    // college exact case-insensitive
    if (conditions.college) {
      if (conditions.college.$regex) {
        clauses.push(`college ~* $${idx++}`);
        params.push(conditions.college.$regex);
      } else {
        clauses.push(`college = $${idx++}`);
        params.push(conditions.college);
      }
    }
    // level with possible regex
    if (conditions.level) {
      if (conditions.level.$regex) {
        clauses.push(`level ~* $${idx++}`);
        params.push(conditions.level.$regex);
      } else {
        clauses.push(`level = $${idx++}`);
        params.push(conditions.level);
      }
    }
    if (conditions.assignmentName !== undefined) {
      clauses.push(`assignment_name = $${idx++}`);
      params.push(conditions.assignmentName);
    }
    if (conditions.title) {
      if (conditions.title.$regex) {
        clauses.push(`title ~* $${idx++}`);
        params.push(conditions.title.$regex);
      } else {
        clauses.push(`title ~* $${idx++}`);
        params.push(conditions.title);
      }
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await sql.query(
      `SELECT * FROM toc_documents ${where} ORDER BY level, uploaded_at DESC`,
      params
    );
    return rows.map(mapRow);
  },

  async findById(id) {
    const rows = await sql.query('SELECT * FROM toc_documents WHERE id = $1', [id]);
    return mapRow(rows[0]);
  },

  async create(data) {
    const rows = await sql.query(
      `INSERT INTO toc_documents (college, assignment_name, title, level, file_name, file_path, file_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [data.college, data.assignmentName, data.title, data.level, data.fileName, data.filePath, data.fileUrl]
    );
    return mapRow(rows[0]);
  },

  async findByIdAndUpdate(id, data) {
    const fieldMap = {
      college: 'college', assignmentName: 'assignment_name',
      title: 'title', level: 'level',
      fileName: 'file_name', filePath: 'file_path', fileUrl: 'file_url',
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
      `UPDATE toc_documents SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return mapRow(rows[0]);
  },

  async findByIdAndDelete(id) {
    const rows = await sql.query('DELETE FROM toc_documents WHERE id = $1 RETURNING *', [id]);
    return mapRow(rows[0]);
  },

  async distinct(field, conditions = {}) {
    const colMap = { assignmentName: 'assignment_name', college: 'college', level: 'level', title: 'title' };
    const col = colMap[field] || field;
    const params = [];
    const clauses = [`${col} IS NOT NULL`, `${col} != ''`];
    let idx = 1;
    if (conditions.college) { clauses.push(`college = $${idx++}`); params.push(conditions.college); }
    if (conditions.level) { clauses.push(`level = $${idx++}`); params.push(conditions.level); }
    if (conditions.title) {
      clauses.push(`title ~* $${idx++}`);
      params.push(conditions.title.$regex || conditions.title);
    }
    const rows = await sql.query(
      `SELECT DISTINCT ${col} FROM toc_documents WHERE ${clauses.join(' AND ')} ORDER BY ${col}`,
      params
    );
    return rows.map(r => r[col]).filter(Boolean);
  },
};

export default TocDocument;
