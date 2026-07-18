import dataSource from '../../data-source';

async function check() {
  await dataSource.initialize();
  try {
    const migrations = await dataSource.query(`SELECT * FROM migrations ORDER BY id DESC`);
    console.log('--- Migrations executed in database ---');
    console.log(migrations);
  } catch (e: any) {
    console.log('No migrations table or error:', e.message);
  }
  await dataSource.destroy();
}

check().catch(e => { console.error(e); process.exit(1); });
