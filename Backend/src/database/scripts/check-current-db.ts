import dataSource from '../../data-source';

async function check() {
  await dataSource.initialize();
  
  const cols = await dataSource.query(`
    SELECT column_name, is_nullable, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'placement_questions'
    ORDER BY column_name
  `);
  console.log('--- Columns on placement_questions ---');
  console.log(cols);

  const rowCount = await dataSource.query(`SELECT count(*) FROM placement_questions`);
  console.log('Total row count:', rowCount[0].count);

  if (parseInt(rowCount[0].count) > 0) {
    const sample = await dataSource.query(`SELECT id, "questionText", "setName", "orderInSet" FROM placement_questions LIMIT 5`);
    console.log('--- Sample rows ---');
    console.log(sample);
  }

  await dataSource.destroy();
}

check().catch(e => { console.error(e); process.exit(1); });
