import { DataSource } from 'typeorm';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const isCompiled = __filename.endsWith('.js');

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  synchronize: false,
  logging: false,
  entities: [
    join(__dirname, isCompiled ? '**/*.entity.js' : '**/*.entity.ts')
  ],
  migrations: [
    join(__dirname, isCompiled
      ? 'database/migrations/*.js'
      : 'database/migrations/*.ts'
    )
  ],
});