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

async function deepClean() {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Connected.');

    try {
        console.log('⚠️  STARTING DEEP CLEAN ⚠️');
        console.log('Preserving Users & Tipsters (unless @example.com). Wiping everything else.');

        // Order matters due to foreign keys
        const tablesToTruncate = [
            'user_purchased_picks',
            'pick_marketplace',
            'accumulator_picks', // Detail records for tickets
            'accumulator_tickets', // The tickets themselves
            'escrow_funds',
            'wallet_transactions',
            'deposit_requests',
            'withdrawal_requests',
            'notifications',
            'predictions', // AI Predictions
            // 'prediction_fixtures', // If exists? Likely cascade delete from predictions
        ];

        for (const table of tablesToTruncate) {
            try {
                // CASCADE is needed if there are FKs we didn't list or circular deps
                await dataSource.query(`TRUNCATE TABLE ${table} CASCADE`);
                console.log(`🗑️  Truncated table: ${table}`);
            } catch (e: any) {
                // If table doesn't exist, ignore
                if (e.code === '42P01') {
                    console.log(`ℹ️  Table ${table} does not exist, skipping.`);
                } else {
                    console.error(`❌ Failed to truncate ${table}:`, e.message);
                }
            }
        }

        // Delete fake users (@example.com)
        console.log('🧹 Deleting fake users (@example.com)...');
        const usersToDelete = await dataSource.query(`
          SELECT id FROM users WHERE email LIKE '%@example.com'
        `);

        if (usersToDelete.length > 0) {
            const ids = usersToDelete.map((u: any) => u.id);
            console.log(`Found ${ids.length} fake users to delete.`);

            // Delete linked Tipsters manually (if no strict FK constraint found)
            await dataSource.query(`DELETE FROM tipsters WHERE user_id = ANY($1)`, [ids]);
            console.log(`   Deleted associated Tipster profiles for ${ids.length} users.`);

            // Delete Users (Cascades to Wallets, TipsterRequests)
            await dataSource.query(`DELETE FROM users WHERE id = ANY($1)`, [ids]);
            console.log(`   Deleted ${ids.length} Users.`);
        } else {
            console.log('   No @example.com users found.');
        }

        // Reset User Wallets (Don't delete remaining, just reset balance)
        console.log('🔄 Resetting remaining User Wallets...');
        await dataSource.query(`
      UPDATE user_wallets 
      SET balance = 0.00, 
          status = 'active',
          updated_at = NOW()
    `);
        console.log('✅ Wallets reset to 0.00');

        console.log('✨ Deep Clean Complete.');

    } catch (error) {
        console.error('❌ Error during deep clean:', error);
        process.exit(1);
    } finally {
        await dataSource.destroy();
    }
}

deepClean();
