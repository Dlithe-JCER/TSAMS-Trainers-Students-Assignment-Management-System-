import { sql } from '../config/db.js';

function mapRow(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    usn: row.usn,
    college: row.college,
    sec: row.sec || '',
    sem: row.sem || '',
    branch: row.branch || '',
    email: row.email || '',
    cleanKey: row.clean_key || '',
    registrationStatus: row.registration_status || '',
    personalEmailId: row.personal_email_id || '',
    contactNumber: row.contact_number || '',
    formProgrammingLanguage: row.form_programming_language || '',
    toolProgrammingLanguage: row.tool_programming_language || '',
    questionTitle: row.question_title || '',
    assessmentStatus: row.assessment_status || '',
    assignedBatch: row.assigned_batch || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const FIELDS = `id, name, usn, college, sec, sem, branch, email, clean_key,
  registration_status, personal_email_id, contact_number,
  form_programming_language, tool_programming_language,
  question_title, assessment_status, assigned_batch,
  created_at, updated_at`;

const Student = {
  async findOne(conditions = {}) {
    const { usn } = conditions;
    if (usn) {
      const rows = await sql.query(
        `SELECT ${FIELDS} FROM students WHERE usn = $1 LIMIT 1`,
        [usn]
      );
      return mapRow(rows[0]);
    }
    return null;
  },

  async find() {
    const rows = await sql.query(
      `SELECT ${FIELDS} FROM students ORDER BY name`
    );
    return rows.map(mapRow);
  },

  async findById(id) {
    const rows = await sql.query(
      `SELECT ${FIELDS} FROM students WHERE id = $1`,
      [id]
    );
    return mapRow(rows[0]);
  },

  async findByUsn(usn) {
    const rows = await sql.query(
      `SELECT ${FIELDS} FROM students WHERE usn = $1`,
      [usn]
    );
    return mapRow(rows[0]);
  },

  async create(data) {
    const rows = await sql.query(
      `INSERT INTO students
         (name, usn, college, sec, sem, branch, email, clean_key,
          registration_status, personal_email_id, contact_number,
          form_programming_language, tool_programming_language,
          question_title, assessment_status, assigned_batch)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING id`,
      [
        data.name, data.usn, data.college || '',
        data.sec || null, data.sem || null, data.branch || null,
        data.email || null, data.cleanKey || null,
        data.registrationStatus || null, data.personalEmailId || null,
        data.contactNumber || null, data.formProgrammingLanguage || null,
        data.toolProgrammingLanguage || null, data.questionTitle || null,
        data.assessmentStatus || null, data.assignedBatch || null,
      ]
    );
    return this.findById(rows[0].id);
  },

  async update(id, data) {
    await sql.query(
      `UPDATE students SET
         name=$1, usn=$2, college=$3, sec=$4, sem=$5, branch=$6,
         email=$7, clean_key=$8, registration_status=$9,
         personal_email_id=$10, contact_number=$11,
         form_programming_language=$12, tool_programming_language=$13,
         question_title=$14, assessment_status=$15, assigned_batch=$16,
         updated_at=NOW()
       WHERE id=$17`,
      [
        data.name, data.usn, data.college || '',
        data.sec || null, data.sem || null, data.branch || null,
        data.email || null, data.cleanKey || null,
        data.registrationStatus || null, data.personalEmailId || null,
        data.contactNumber || null, data.formProgrammingLanguage || null,
        data.toolProgrammingLanguage || null, data.questionTitle || null,
        data.assessmentStatus || null, data.assignedBatch || null,
        id,
      ]
    );
    return this.findById(id);
  },

  async delete(id) {
    await sql.query(`DELETE FROM students WHERE id=$1`, [id]);
  },
};

export default Student;
