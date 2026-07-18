import dataSource from '../../data-source';
import * as bcrypt from 'bcrypt';

/**
 * Usage:
 * npx ts-node src/database/scripts/reset-user-password.ts <username_or_email> <new_password>
 * Example:
 * npx ts-node src/database/scripts/reset-user-password.ts arunkumar password123
 */
async function reset() {
  const target = process.argv[2]?.trim().toLowerCase();
  const newPass = process.argv[3];

  if (!target || !newPass) {
    console.error('Usage: npx ts-node src/database/scripts/reset-user-password.ts <username_or_email> <new_password>');
    process.exit(1);
  }

  await dataSource.initialize();
  
  const user = await dataSource.query(
    `SELECT id, username, email FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $1 LIMIT 1`,
    [target]
  );

  if (!user || user.length === 0) {
    console.error(`❌ User not found matching "${target}" (neither username nor email)`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(newPass, 10);
  await dataSource.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, user[0].id]);

  console.log(`✅ Password successfully reset for user "${user[0].username}" (${user[0].email}) to: "${newPass}"`);
  await dataSource.destroy();
}

reset().catch(e => { console.error(e); process.exit(1); });
