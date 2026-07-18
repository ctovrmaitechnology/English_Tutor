import dataSource from '../../data-source';
import * as bcrypt from 'bcrypt';

async function test() {
  await dataSource.initialize();
  
  const users = await dataSource.query(`SELECT id, username, email, is_active, password_hash FROM users LIMIT 10`);
  console.log(`Found ${users.length} users.`);
  for (const u of users) {
    console.log(`- Username: "${u.username}", Email: "${u.email}", Active: ${u.is_active}, Hash length: ${u.password_hash?.length}`);
  }

  await dataSource.destroy();
}

test().catch(e => { console.error(e); process.exit(1); });
