import { sql } from '../config/db.js';

function mapRow(row) {
  if (!row) return null;
  const obj = {
    _id: row.id,
    id: row.id,
    trainerId: row.trainer_id,
    trainerName: row.trainer_name,
    college: row.college,
    classroom: row.classroom,
    assignmentName: row.assignment_name,
    batchName: row.batch_name,
    topicsCovered: row.topics_covered,
    sessionDate: row.session_date,
    githubLink: row.github_link,
    assignmentLink: row.assignment_link,
    morningSession1: row.morning_session1,
    morningSession2: row.morning_session2,
    afternoonSession1: row.afternoon_session1,
    afternoonSession2: row.afternoon_session2,
    status: row.status,
    feedback: row.feedback,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  // populated trainerId
  if (row.t_name !== undefined) {
    obj.trainerId = row.trainer_id
      ? { _id: row.trainer_id, id: row.trainer_id, name: row.t_name, email: row.t_email, college: row.t_college }
      : null;
  }
  return obj;
}

const Submission = {
  async create(data) {
    const rows = await sql.query(
      `INSERT INTO submissions
         (trainer_id, trainer_name, college, classroom, assignment_name, batch_name,
          topics_covered, session_date, github_link, assignment_link,
          morning_session1, morning_session2, afternoon_session1, afternoon_session2)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        data.trainerId || null,
        data.trainerName,
        data.college || null,
        data.classroom || null,
        data.assignmentName || null,
        data.batchName,
        data.topicsCovered,
        data.sessionDate,
        data.githubLink,
        data.assignmentLink,
        data.morningSession1 || 0,
        data.morningSession2 || 0,
        data.afternoonSession1 || 0,
        data.afternoonSession2 || 0,
      ]
    );
    return mapRow(rows[0]);
  },

  async find(conditions = {}) {
    const params = [];
    const clauses = [];
    let idx = 1;
    if (conditions.college !== undefined) { clauses.push(`s.college = $${idx++}`); params.push(conditions.college); }
    if (conditions.assignmentName !== undefined) { clauses.push(`s.assignment_name = $${idx++}`); params.push(conditions.assignmentName); }
    if (conditions.trainerId !== undefined) { clauses.push(`s.trainer_id = $${idx++}`); params.push(conditions.trainerId); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await sql.query(
      `SELECT s.*, t.name AS t_name, t.email AS t_email, t.college AS t_college
       FROM submissions s
       LEFT JOIN trainers t ON t.id = s.trainer_id
       ${where} ORDER BY s.created_at DESC`,
      params
    );
    return rows.map(mapRow);
  },

  async findById(id) {
    const rows = await sql.query(
      `SELECT s.*, t.name AS t_name, t.email AS t_email, t.college AS t_college
       FROM submissions s
       LEFT JOIN trainers t ON t.id = s.trainer_id
       WHERE s.id = $1`,
      [id]
    );
    return mapRow(rows[0]);
  },

  async findByIdAndUpdate(id, data) {
    const fieldMap = {
      batchName: 'batch_name', topicsCovered: 'topics_covered', sessionDate: 'session_date',
      githubLink: 'github_link', assignmentLink: 'assignment_link',
      status: 'status', feedback: 'feedback',
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
    await sql.query(`UPDATE submissions SET ${sets.join(', ')} WHERE id = $${idx}`, params);
    return this.findById(id);
  },

  async findByIdAndDelete(id) {
    const existing = await this.findById(id);
    if (!existing) return null;
    await sql.query('DELETE FROM submissions WHERE id = $1', [id]);
    return existing;
  },

  async distinct(field, conditions = {}) {
    const colMap = { assignmentName: 'assignment_name' };
    const col = colMap[field] || field;
    const params = [];
    const clauses = [`${col} IS NOT NULL`, `${col} != ''`];
    let idx = 1;
    if (conditions.college !== undefined) { clauses.push(`college = $${idx++}`); params.push(conditions.college); }
    const rows = await sql.query(
      `SELECT DISTINCT ${col} FROM submissions WHERE ${clauses.join(' AND ')} ORDER BY ${col}`,
      params
    );
    return rows.map(r => r[col]).filter(Boolean);
  },
};

export default Submission;
