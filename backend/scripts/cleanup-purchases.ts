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
    logging: true,
});

async function cleanup() {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Connected.');

    try {
        console.log('🔍 Checking for duplicate UserPurchasedPick records (same userId, accumulatorId)...');

        const duplicates = await dataSource.query(`
      SELECT user_id, accumulator_id, COUNT(*) 
      FROM user_purchased_picks 
      GROUP BY user_id, accumulator_id 
      HAVING COUNT(*) > 1
    `);

        console.log(`Found ${duplicates.length} pairs of (userId, accumulatorId) with duplicates.`);

        if (duplicates.length === 0) {
            console.log('🎉 No duplicates found.');
            return;
        }

        let totalDeleted = 0;

        for (const group of duplicates) {
            const { user_id, accumulator_id } = group;
            console.log(`Processing user_id=${user_id}, accumulator_id=${accumulator_id}...`);

            // Keep the one with the HIGHEST ID (most recent), assuming it's the valid one.
            const records = await dataSource.query(`
        SELECT id, purchased_at 
        FROM user_purchased_picks 
        WHERE user_id = $1 AND accumulator_id = $2
        ORDER BY id DESC
      `, [user_id, accumulator_id]);

            const [keep, ...remove] = records;

            if (remove.length > 0) {
                const removeIds = remove.map(r => r.id);
                console.log(`   Keeping ID ${keep.id}, removing IDs: ${removeIds.join(', ')}`);

                await dataSource.query(`
          DELETE FROM user_purchased_picks WHERE id = ANY($1)
        `, [removeIds]);

                totalDeleted += removeIds.length;
            }
        }

        console.log(`✨ Cleanup complete. Deleted ${totalDeleted} duplicate purchase records.`);

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    } finally {
        await dataSource.destroy();
    }
}

cleanup();
