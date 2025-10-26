// import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const ormConfig: any = {
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'psql_admin',
  password: 'Yc5cvHKqN8Uoa7U',
  database: 'SportBooking',
  entities: ['dist/entities/**/*.js'],
  synchronize: false,
  options: {
    encrypt: false,
  },
};
