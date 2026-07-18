import dataSource from '../../data-source';

async function check() {
  await dataSource.initialize();
  const users = await dataSource.query(`
    SELECT id, username, email, is_active, password_hash, created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT 20
  `);
  console.log('--- Current Users in Database ---');
  users.forEach((u: any) => {
    console.log({
      id: u.id,
      username: u.username,
      email: u.email,
      is_active: u.is_active,
      has_password_hash: !!u.password_hash && u.password_hash.startsWith('$2'),
      created_at: u.created_at
    });
  });
  await dataSource.destroy();
}

check().catch(e => { console.error(e); process.exit(1); });
