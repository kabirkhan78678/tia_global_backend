const fs = require('fs');
const path = require('path');
const { pool } = require('./src/config/db');

async function runSqlFile(filePath) {
  console.log(`Reading SQL file: ${path.basename(filePath)}...`);
  const sql = fs.readFileSync(filePath, 'utf8');

  // Split queries by semicolon (making sure not to split inside comments or strings where possible)
  // A simple split is usually sufficient for standard schema files
  const queries = sql
    .split(/;\s*$/m)
    .map(q => q.trim())
    .filter(q => q.length > 0);

  console.log(`Executing ${queries.length} queries...`);
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    try {
      await pool.query(query);
    } catch (err) {
      // If error is duplicate key or columns already exist, we can ignore or print warning
      if (err.code === 'ER_DUP_ENTRY' || err.message.includes('already exists')) {
        continue;
      }
      console.warn(`Warning in query ${i + 1}: ${err.message}`);
    }
  }
  console.log(`Finished executing ${path.basename(filePath)}.\n`);
}

async function main() {
  try {
    console.log('Starting TIA Global Database Tables Setup...\n');

    // 1. Assignments tables
    const assignmentsSql = path.join(__dirname, 'database/create_assignments.sql');
    if (fs.existsSync(assignmentsSql)) {
      await runSqlFile(assignmentsSql);
    }

    // 2. Fee Management & Payment tables
    const feeManagementSql = path.join(__dirname, 'database/create_fee_management_tables.sql');
    if (fs.existsSync(feeManagementSql)) {
      await runSqlFile(feeManagementSql);
    }

    console.log('✅ Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
  } finally {
    await pool.end();
  }
}

main();
