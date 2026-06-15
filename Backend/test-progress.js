require('dotenv').config();
const { Client } = require('pg');

async function checkDatabase() {
  console.log("Connecting to database...");
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully!");

    // Check columns of tutor_module_progress
    const columnsRes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'tutor_module_progress';
    `);
    console.log("\n--- tutor_module_progress Columns ---");
    console.log(columnsRes.rows);

  } catch (err) {
    console.error("Database check failed:", err.message);
  } finally {
    await client.end();
  }
}

checkDatabase();
