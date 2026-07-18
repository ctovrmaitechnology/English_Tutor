import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

async function debugSync() {
  const isCompiled = __filename.endsWith('.js');
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
    synchronize: true,
    logging: ['query', 'schema', 'error'],
    entities: [
      join(__dirname, '../../', isCompiled ? '**/*.entity.js' : '**/*.entity.ts')
    ],
  });

  console.log('Connecting with synchronize: true to see exact SQL...');
  try {
    await ds.initialize();
    console.log('✅ ds.initialize() succeeded without error!');
    await ds.destroy();
  } catch (e: any) {
    console.error('❌ Synchronize error:', e.message);
    console.error(e.stack);
  }
}

debugSync().catch(e => { console.error(e); process.exit(1); });
