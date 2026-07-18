import dataSource from '../../data-source';

async function fix() {
  await dataSource.initialize();
  
  console.log('Cleaning up NULL sets...');
  await dataSource.query(`DELETE FROM placement_questions WHERE "setName" IS NULL OR "orderInSet" IS NULL`);

  console.log('Updating SET_A -> A, SET_B -> B, SET_C -> C...');
  await dataSource.query(`UPDATE placement_questions SET "setName" = 'A' WHERE "setName" = 'SET_A'`);
  await dataSource.query(`UPDATE placement_questions SET "setName" = 'B' WHERE "setName" = 'SET_B'`);
  await dataSource.query(`UPDATE placement_questions SET "setName" = 'C' WHERE "setName" = 'SET_C'`);

  console.log('Applying NOT NULL and length constraints on setName and orderInSet...');
  await dataSource.query(`ALTER TABLE placement_questions ALTER COLUMN "setName" TYPE character varying(1)`);
  await dataSource.query(`ALTER TABLE placement_questions ALTER COLUMN "setName" SET NOT NULL`);
  await dataSource.query(`ALTER TABLE placement_questions ALTER COLUMN "orderInSet" SET NOT NULL`);

  console.log('✅ placement_questions table updated successfully.');
  await dataSource.destroy();
}

fix().catch(e => { console.error(e); process.exit(1); });
