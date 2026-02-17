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

async function diagnose() {
    await dataSource.initialize();
    console.log('📊 Diagnostic Report');
    console.log('-------------------');

    try {
        // 1. Escrow Stats
        const escrowSum = await dataSource.query(`
      SELECT SUM(amount) as total, COUNT(*) as count 
      FROM escrow_funds 
      WHERE status = 'held'
    `);
        console.log(`💰 Escrow (Held): ${escrowSum[0].total} (Count: ${escrowSum[0].count})`);

        const topEscrows = await dataSource.query(`
      SELECT id, user_id, pick_id, amount, created_at 
      FROM escrow_funds 
      WHERE status = 'held' 
      ORDER BY amount DESC 
      LIMIT 5
    `);
        console.log('   Top 5 Held Escrows:', topEscrows);

        // 2. Revenue Stats
        const revenueSum = await dataSource.query(`
      SELECT SUM(purchase_price) as total, COUNT(*) as count 
      FROM user_purchased_picks
    `);
        console.log(`\n📉 Revenue (Purchases): ${revenueSum[0].total} (Count: ${revenueSum[0].count})`);

        const topPurchases = await dataSource.query(`
      SELECT id, user_id, accumulator_id, purchase_price, purchased_at 
      FROM user_purchased_picks 
      ORDER BY purchase_price DESC 
      LIMIT 5
    `);
        console.log('   Top 5 Purchases:', topPurchases);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await dataSource.destroy();
    }
}

diagnose();
