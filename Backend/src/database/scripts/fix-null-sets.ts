import dataSource from '../../data-source';

async function fix() {
  await dataSource.initialize();
  
  const totalCount = await dataSource.query(`SELECT count(*) FROM placement_questions`);
  const nullCount = await dataSource.query(`SELECT count(*) FROM placement_questions WHERE "setName" IS NULL OR "orderInSet" IS NULL`);
  
  console.log(`Total rows in placement_questions: ${totalCount[0].count}`);
  console.log(`Rows with NULL setName or orderInSet: ${nullCount[0].count}`);
  
  if (parseInt(nullCount[0].count) > 0) {
    console.log('Cleaning up old unassigned adaptive rows (or updating NULL values) so NOT NULL constraints can apply...');
    // Since fixed sets A, B, C are what we use now and old unassigned rows break NOT NULL constraints, we clean up rows with NULL setName
    await dataSource.query(`DELETE FROM placement_questions WHERE "setName" IS NULL OR "orderInSet" IS NULL`);
    console.log('Deleted old rows with NULL setName / orderInSet.');
  }

  await dataSource.destroy();
}

fix().catch(e => { console.error(e); process.exit(1); });
