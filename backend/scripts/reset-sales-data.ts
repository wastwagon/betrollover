import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { config } from 'dotenv';

// Load env vars
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

async function reset() {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Connected.');

    try {
        console.log('⚠️  STARTING DATA RESET ⚠️');
        console.log('This will delete ALL Purchase History and Escrow Funds.');

        // 1. Delete Purchases
        const purchaseResult = await dataSource.query(`DELETE FROM user_purchased_picks`);
        console.log(`🗑️  Deleted ${purchaseResult[1]} records from 'user_purchased_picks'.`);

        // 2. Delete Escrows
        // We could just delete 'held', but to be clean let's wipe it all or stick to plan.
        // Plan said "All EscrowFund records".
        const escrowResult = await dataSource.query(`DELETE FROM escrow_funds`);
        console.log(`🗑️  Deleted ${escrowResult[1]} records from 'escrow_funds'.`);

        console.log('✨ Data Reset Complete. Dashboard should now show 0 Revenue / 0 Escrow.');

    } catch (error) {
        console.error('❌ Error during reset:', error);
        process.exit(1);
    } finally {
        await dataSource.destroy();
    }
}

reset();
