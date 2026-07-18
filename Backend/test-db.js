require('dotenv').config();

const { Client } = require('pg');
console.log(process.env.DATABASE_URL);
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function testConnection() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL');

    const result = await client.query('SELECT NOW()');
    console.log('Server Time:', result.rows[0]);

    await client.end();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Connection failed');
    console.error(error.message);
  }
}

testConnection();