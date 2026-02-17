import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

config(); // Load .env file

export default new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'betrollover',
    password: process.env.POSTGRES_PASSWORD || 'betrollover_dev',
    database: process.env.POSTGRES_DB || 'betrollover',
    namingStrategy: new SnakeNamingStrategy(),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
});
