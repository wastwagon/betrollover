import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { config } from 'dotenv';

// Load env vars, prioritizing command line envs
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
        console.log('🔍 Checking for duplicate EscrowFund records (same userId, pickId)...');

        // Find duplicates
        const pksWithDuplicates = await dataSource.query(`
      SELECT user_id, pick_id, COUNT(*) 
      FROM escrow_funds 
      GROUP BY user_id, pick_id 
      HAVING COUNT(*) > 1
    `);

        console.log(`Found ${pksWithDuplicates.length} pairs of (userId, pickId) with duplicates.`);

        if (pksWithDuplicates.length === 0) {
            console.log('🎉 No duplicates found.');
            return;
        }

        let totalDeleted = 0;

        for (const group of pksWithDuplicates) {
            const { user_id, pick_id } = group;
            console.log(`Processing user_id=${user_id}, pick_id=${pick_id}...`);

            // Get all records for this pair, ordered by ID desc (keep newest)
            // or asc (keep oldest)? Usually keep oldest if it's "first come", or newest if "latest state".
            // Issue: If we delete the one that is linked to a transaction, we might have issues.
            // But EscrowFund is usually a leaf or linked from WalletTransaction.
            // Let's keep the one with the HIGHEST ID (most recent) assuming it's the valid one,
            // OR keeps the one with status 'held' if others are 'released'?
            // Simple logic: Keep the one on top (highest ID) as it's likely the one the user sees or is active.
            // Actually, if they double-clicked, they represent the same intent.

            const records = await dataSource.query(`
        SELECT id, status, created_at 
        FROM escrow_funds 
        WHERE user_id = $1 AND pick_id = $2
        ORDER BY id DESC
      `, [user_id, pick_id]);

            // Keep the first one (highest ID), delete the rest
            const [keep, ...remove] = records;

            if (remove.length > 0) {
                const removeIds = remove.map(r => r.id);
                console.log(`   Keeping ID ${keep.id} (${keep.status}), removing IDs: ${removeIds.join(', ')}`);

                await dataSource.query(`
          DELETE FROM escrow_funds WHERE id = ANY($1)
        `, [removeIds]);

                totalDeleted += removeIds.length;
            }
        }

        console.log(`✨ Cleanup complete. Deleted ${totalDeleted} duplicate records.`);

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    } finally {
        await dataSource.destroy();
    }
}

cleanup();
