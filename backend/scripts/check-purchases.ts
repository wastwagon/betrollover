import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { config } from 'dotenv';

config();

const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'betrollover',
    password: process.env.POSTGRES_PASSWORD || 'betrollover_dev',
    database: process.env.POSTGRES_DB || 'betrollover',
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: false,
    logging: false,
});

async function check() {
    await dataSource.initialize();

    try {
        console.log('🔍 Checking for duplicate UserPurchasedPick records...');
        const result = await dataSource.query(`
      SELECT user_id, accumulator_id, COUNT(*) 
      FROM user_purchased_picks 
      GROUP BY user_id, accumulator_id 
      HAVING COUNT(*) > 1
    `);

        console.log(`Found ${result.length} pairs with duplicates.`);

        if (result.length > 0) {
            const total = result.reduce((acc: number, row: any) => acc + parseInt(row.count, 10), 0);
            console.log(`Total duplicate rows involved: ${total}`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await dataSource.destroy();
    }
}

check();
