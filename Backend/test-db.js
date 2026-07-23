require('dotenv').config();
const { DataSource } = require('typeorm');
const ds = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/english_tutor',
});
ds.initialize().then(async () => {
  const res = await ds.query('SELECT DISTINCT module_id FROM module_questions;');
  console.log('Available moduleIds in db:', res.map(r => r.module_id));
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
