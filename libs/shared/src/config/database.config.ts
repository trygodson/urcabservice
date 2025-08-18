import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'postgres',
  host: process.env['PG_HOST'],
  port: parseInt(process.env['PG_PORT'] ?? '35432', 10) || 35432,
  username: process.env['PG_USERNAME'],
  password: process.env['PG_PASSWORD'],
  database: process.env['PG_DATABASE'],
  ssl: {
    rejectUnauthorized: false,
  },
  schema: 'public',
  autoLoadEntities: true,
  // entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
  synchronize: false,
  logging: process.env['SYNCHRONIZE'],
  migrations: [`${__dirname}/../../db/migrations/*{.ts,.js}`],
  migrationsTableName: 'migrations',
}));
