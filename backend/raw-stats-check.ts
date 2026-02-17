
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'betrollover',
    password: process.env.POSTGRES_PASSWORD || 'betrollover_dev',
    database: process.env.POSTGRES_DB || 'betrollover',
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: false,
});

async function checkStats() {
    try {
        await dataSource.initialize();
        console.log("Database initialized successfully.");

        const queries = [
            { name: "Escrow Held Total", sql: "SELECT count(*) as count, sum(amount) as total FROM escrow_funds WHERE status = 'held';" },
            { name: "Total Purchases Volume", sql: "SELECT count(*) as count, sum(purchase_price) as total FROM user_purchased_picks;" },
            { name: "Wallet Balance Total", sql: "SELECT count(*) as count, sum(balance) as total FROM user_wallets;" },
            { name: "Total Picks", sql: "SELECT count(*) as count FROM accumulator_tickets;" },
            { name: "Duplicate Escrow Check", sql: "SELECT user_id, pick_id, count(*), sum(amount) FROM escrow_funds GROUP BY user_id, pick_id HAVING count(*) > 1 LIMIT 10;" },
            { name: "Duplicate Purchase Check", sql: "SELECT user_id, accumulator_id, count(*), sum(purchase_price) FROM user_purchased_picks GROUP BY user_id, accumulator_id HAVING count(*) > 1 LIMIT 10;" },
            { name: "Duplicate Picks Check", sql: "SELECT title, user_id, count(*) FROM accumulator_tickets GROUP BY title, user_id HAVING count(*) > 1 LIMIT 10;" },
            { name: "Table Constraints Check", sql: "SELECT conname, contype FROM pg_constraint WHERE conrelid = 'user_purchased_picks'::regclass;" },
            { name: "Smart Coupons Total", sql: "SELECT count(*) as count FROM smart_coupons;" },
            { name: "Recent Escrow (Held)", sql: "SELECT id, amount, status, created_at FROM escrow_funds WHERE status = 'held' ORDER BY created_at DESC LIMIT 5;" },
            { name: "Recent Purchases", sql: "SELECT id, purchase_price, purchased_at FROM user_purchased_picks ORDER BY purchased_at DESC LIMIT 5;" }
        ];

        for (const q of queries) {
            const result = await dataSource.query(q.sql);
            console.log(`\n--- ${q.name} ---`);
            console.table(result);
        }

        await dataSource.destroy();
    } catch (err) {
        console.error("Error checking stats:", err);
    }
}

checkStats();
