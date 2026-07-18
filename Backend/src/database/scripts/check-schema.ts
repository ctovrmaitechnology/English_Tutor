import dataSource from '../../data-source';

async function check() {
  await dataSource.initialize();
  const res = await dataSource.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_name IN ('placement_questions', 'placement_attempts', 'placement_responses')
    ORDER BY table_name, column_name
  `);
  console.log(JSON.stringify(res, null, 2));
  await dataSource.destroy();
}

check().catch(e => { console.error(e); process.exit(1); });
