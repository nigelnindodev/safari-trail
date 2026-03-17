import { join } from 'path';
import { DataSource } from 'typeorm';
import { AppConfigService } from './config';

const appConfigService = new AppConfigService();

export default new DataSource({
  type: 'postgres',
  ...appConfigService.database,
  entities: [join(__dirname, '**/*.entity.ts')],
  migrations: [join(__dirname, 'migrations/*{.js,.ts}')],
  migrationsTableName: `typeorm_migrations`,
});
