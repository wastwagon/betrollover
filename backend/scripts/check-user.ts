import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { User } from '../src/modules/users/entities/user.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'betrollover',
    password: process.env.POSTGRES_PASSWORD || 'betrollover_dev',
    database: process.env.POSTGRES_DB || 'betrollover',
    entities: [User],
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: false,
    logging: false,
});

async function checkUser() {
    await dataSource.initialize();
    const email = 'gilbert.amidu@gmail.com';
    const user = await dataSource.getRepository(User).findOne({ where: { email } });

    if (user) {
        console.log(`User found: ${user.email} (ID: ${user.id})`);
    } else {
        console.log(`User not found: ${email}`);
    }

    await dataSource.destroy();
}

checkUser().catch((err) => {
    console.error('Error checking user:', err);
    process.exit(1);
});
