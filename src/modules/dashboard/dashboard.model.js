const { pool } = require('../../config/db');

/**
 * Get linked children for a parent
 */
exports.getParentLinkedChildren = async (parentId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      s.id,
      s.first_name,
      s.last_name,
      s.email,
      s.grade_level,
      s.academy,
      s.profile_image
    FROM parent_students ps
    INNER JOIN students s ON s.id = ps.student_id
    WHERE ps.parent_id = ?
    ORDER BY s.first_name ASC
    `,
    [parentId]
  );

  return rows;
};

/**
 * Get student details by ID
 */
exports.getStudentById = async (studentId) => {
  const [rows] = await pool.execute(
    `
    SELECT id, first_name, last_name, email, grade_level, academy, status, profile_image
    FROM students
    WHERE id = ?
    LIMIT 1
    `,
    [studentId]
  );

  return rows[0] || null;
};

/**
 * Get assignment stats for a student
 */
exports.getStudentAssignmentStats = async (studentId, gradeLevel) => {
  const [rows] = await pool.execute(
    `
    SELECT
      COUNT(a.id) AS total_assignments,
      SUM(CASE WHEN sub.status IN ('submitted', 'graded') THEN 1 ELSE 0 END) AS completed_assignments,
      SUM(CASE WHEN sub.status IS NULL OR sub.status = 'pending' THEN 1 ELSE 0 END) AS pending_assignments
    FROM assignments a
    LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
    WHERE a.grade_level = ?
    `,
    [studentId, gradeLevel]
  );

  const stats = rows[0] || {};

  return {
    total_assignments: parseInt(stats.total_assignments || 0, 10),
    completed_assignments: parseInt(stats.completed_assignments || 0, 10),
    pending_assignments: parseInt(stats.pending_assignments || 0, 10),
  };
};

/**
 * Get recent assignments for a student
 */
exports.getStudentRecentAssignments = async (studentId, gradeLevel, limit = 5) => {
  const [rows] = await pool.execute(
    `
    SELECT
      a.id AS assignment_id,
      a.title AS book,
      COALESCE(a.subject, 'General') AS subject_area,
      a.total_points,
      a.due_date,
      a.created_at,
      COALESCE(sub.status, 'pending') AS status,
      sub.marks_obtained,
      sub.grade,
      sub.submitted_at,
      sub.graded_at,
      CASE
        WHEN sub.status = 'graded' AND sub.marks_obtained IS NOT NULL THEN CONCAT(sub.marks_obtained, '/', a.total_points)
        WHEN sub.status = 'graded' AND sub.grade IS NOT NULL THEN sub.grade
        WHEN sub.status = 'submitted' THEN 'Submitted'
        ELSE 'Not Graded'
      END AS score
    FROM assignments a
    LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
    WHERE a.grade_level = ?
    ORDER BY a.created_at DESC
    LIMIT ?
    `,
    [studentId, gradeLevel, limit]
  );

  return rows;
};

/**
 * Calculate weekly progress score out of 500 for a student
 */
exports.getStudentWeeklyProgress = async (studentId, gradeLevel) => {
  // Query completion & scores over the past 7 days / assignments
  const [rows] = await pool.execute(
    `
    SELECT
      DAYNAME(a.created_at) AS day_name,
      DAYOFWEEK(a.created_at) AS day_num,
      COUNT(a.id) AS total_count,
      SUM(CASE WHEN sub.status IN ('submitted', 'graded') THEN 1 ELSE 0 END) AS completed_count,
      AVG(CASE WHEN sub.marks_obtained IS NOT NULL THEN (sub.marks_obtained / a.total_points) * 100 ELSE NULL END) AS avg_score_pct
    FROM assignments a
    LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
    WHERE a.grade_level = ?
    GROUP BY DAYNAME(a.created_at), DAYOFWEEK(a.created_at)
    ORDER BY DAYOFWEEK(a.created_at) ASC
    `,
    [studentId, gradeLevel]
  );

  // Overall completion & grade calculation scaled to 500
  const [overallRows] = await pool.execute(
    `
    SELECT
      COUNT(a.id) AS total_all,
      SUM(CASE WHEN sub.status IN ('submitted', 'graded') THEN 1 ELSE 0 END) AS completed_all,
      AVG(CASE WHEN sub.marks_obtained IS NOT NULL THEN (sub.marks_obtained / a.total_points) * 100 ELSE NULL END) AS overall_avg_pct
    FROM assignments a
    LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
    WHERE a.grade_level = ?
    `,
    [studentId, gradeLevel]
  );

  const overall = overallRows[0] || {};
  const totalAll = parseInt(overall.total_all || 0, 10);
  const completedAll = parseInt(overall.completed_all || 0, 10);
  const avgPct = overall.overall_avg_pct !== null ? parseFloat(overall.overall_avg_pct) : null;

  let currentScore = 0;
  if (totalAll > 0) {
    const completionRate = completedAll / totalAll; // 0.0 to 1.0
    const performanceFactor = avgPct !== null ? avgPct / 100 : completionRate;
    // Weighted 50% completion rate, 50% performance grade
    const combinedFactor = (completionRate * 0.5) + (performanceFactor * 0.5);
    currentScore = Math.round(combinedFactor * 500);
  } else {
    currentScore = 0;
  }

  // Build 7-day breakdown (Mon - Sun)
  const daysMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };

  rows.forEach((row) => {
    const dayNameShort = (row.day_name || '').substring(0, 3);
    if (dayNameShort && daysMap[dayNameShort] !== undefined) {
      const dayTotal = parseInt(row.total_count || 0, 10);
      const dayComp = parseInt(row.completed_count || 0, 10);
      const dayAvg = row.avg_score_pct !== null ? parseFloat(row.avg_score_pct) : 75;
      if (dayTotal > 0) {
        const factor = ((dayComp / dayTotal) * 0.5) + ((dayAvg / 100) * 0.5);
        daysMap[dayNameShort] = Math.round(factor * 500);
      }
    }
  });

  const dailyBreakdown = Object.keys(daysMap).map((day) => ({
    day,
    score: daysMap[day],
  }));

  return {
    scale_max: 500,
    current_score: currentScore,
    daily_breakdown: dailyBreakdown,
  };
};

/**
 * Get upcoming events from events table
 */
exports.getUpcomingEvents = async (categoryFilter = null, gradeLevel = null, limit = 5) => {
  let query = `
    SELECT DISTINCT
      e.id,
      e.title,
      e.description,
      e.event_date,
      e.event_time,
      e.category AS categories,
      e.created_at
    FROM events e
    WHERE e.deleted_at IS NULL
      AND e.event_date >= CURDATE()
  `;

  const params = [];

  if (categoryFilter) {
    query += `
      AND (
        FIND_IN_SET(?, REPLACE(e.category,' ',''))
        OR FIND_IN_SET('ALL', REPLACE(e.category,' ',''))
      )
    `;
    params.push(categoryFilter);
  }

  if (gradeLevel) {
    query += `
      AND (
        NOT FIND_IN_SET('STUDENT', REPLACE(e.category,' ',''))
        OR e.id IN (
          SELECT event_id 
          FROM event_student_grades 
          WHERE grade = ?
        )
      )
    `;
    params.push(gradeLevel);
  }

  query += ` ORDER BY e.event_date ASC, e.event_time ASC LIMIT ?`;
  params.push(limit);

  const [rows] = await pool.execute(query, params);
  return rows;
};

/**
 * Get Teacher Dashboard Statistics
 */
exports.getTeacherDashboardStats = async (teacherId) => {
  // Get teacher's teaching grade
  const [profileRows] = await pool.execute(
    `
    SELECT teaching_grade
    FROM teacher_profiles
    WHERE user_id = ?
    LIMIT 1
    `,
    [teacherId]
  );

  const teachingGrade = profileRows[0] ? profileRows[0].teaching_grade : null;

  // Count total students in teacher's grade
  let totalStudents = 0;
  if (teachingGrade) {
    const [studentRows] = await pool.execute(
      `
      SELECT COUNT(id) AS total
      FROM students
      WHERE grade_level = ? AND status = 'active'
      `,
      [teachingGrade]
    );
    totalStudents = parseInt(studentRows[0].total || 0, 10);
  }

  // Teacher assignment stats
  const [assignmentRows] = await pool.execute(
    `
    SELECT
      COUNT(DISTINCT a.id) AS total_assignments,
      SUM(CASE WHEN sub.status = 'submitted' THEN 1 ELSE 0 END) AS pending_gradings,
      SUM(CASE WHEN sub.status = 'graded' THEN 1 ELSE 0 END) AS completed_gradings
    FROM assignments a
    LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id
    WHERE a.teacher_id = ?
    `,
    [teacherId]
  );

  const assignStats = assignmentRows[0] || {};

  return {
    teaching_grade: teachingGrade,
    total_students: totalStudents,
    total_assignments: parseInt(assignStats.total_assignments || 0, 10),
    pending_gradings: parseInt(assignStats.pending_gradings || 0, 10),
    completed_gradings: parseInt(assignStats.completed_gradings || 0, 10),
  };
};

/**
 * Get Teacher Recent Assignments
 */
exports.getTeacherRecentAssignments = async (teacherId, limit = 5) => {
  const [rows] = await pool.execute(
    `
    SELECT
      a.id AS assignment_id,
      a.title AS book,
      COALESCE(a.subject, 'General') AS subject_area,
      a.grade_level,
      a.due_date,
      a.total_points,
      a.created_at,
      COUNT(sub.id) AS total_submissions,
      SUM(CASE WHEN sub.status = 'submitted' THEN 1 ELSE 0 END) AS pending_gradings,
      SUM(CASE WHEN sub.status = 'graded' THEN 1 ELSE 0 END) AS graded_count
    FROM assignments a
    LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id
    WHERE a.teacher_id = ?
    GROUP BY a.id
    ORDER BY a.created_at DESC
    LIMIT ?
    `,
    [teacherId, limit]
  );

  return rows;
};
