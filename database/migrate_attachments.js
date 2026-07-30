const { pool } = require('../src/config/db');

async function migrate() {
  try {
    console.log('Checking columns for chat_messages table...');
    const [columns] = await pool.query('SHOW COLUMNS FROM chat_messages');
    const columnNames = columns.map(c => c.Field);
    
    let altered = false;
    
    if (!columnNames.includes('attachment_url')) {
      console.log('Adding attachment_url column...');
      await pool.query('ALTER TABLE chat_messages ADD COLUMN attachment_url VARCHAR(500) NULL DEFAULT NULL AFTER body');
      altered = true;
    }
    if (!columnNames.includes('attachment_name')) {
      console.log('Adding attachment_name column...');
      await pool.query('ALTER TABLE chat_messages ADD COLUMN attachment_name VARCHAR(255) NULL DEFAULT NULL AFTER attachment_url');
      altered = true;
    }
    if (!columnNames.includes('attachment_type')) {
      console.log('Adding attachment_type column...');
      await pool.query('ALTER TABLE chat_messages ADD COLUMN attachment_type VARCHAR(100) NULL DEFAULT NULL AFTER attachment_name');
      altered = true;
    }
    
    if (altered) {
      console.log('✅ Columns added successfully.');
    } else {
      console.log('ℹ️ Attachment columns already exist.');
    }
    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
