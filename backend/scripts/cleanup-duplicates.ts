import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'betrollover',
    password: process.env.POSTGRES_PASSWORD || 'betrollover_dev',
    database: process.env.POSTGRES_DB || 'betrollover',
    namingStrategy: new SnakeNamingStrategy(),
});

async function runCleanup() {
    await dataSource.initialize();
    console.log("Database connected. Starting cleanup...");

    // 1. Clean up duplicate Escrow Funds (orphans)
    // Logic: Keep only the one that is linked to a purchase, or the oldest one if no purchase.
    console.log("\n--- Cleaning up Escrow Funds ---");
    // First, identify the IDs we want to KEEP (one per user/pick pair)
    const escrowToKeep = await dataSource.query(`
    SELECT DISTINCT ON (user_id, pick_id) id
    FROM escrow_funds
    ORDER BY user_id, pick_id, id ASC
  `);
    const keepIds = escrowToKeep.map((r: any) => r.id);

    if (keepIds.length > 0) {
        const escrowResult = await dataSource.query(`
      DELETE FROM escrow_funds
      WHERE id NOT IN (${keepIds.join(',')})
    `);
        console.log(`Cleaned up duplicate escrow records.`);
    }

    // 2. Clean up duplicate Accumulator Tickets
    console.log("\n--- Cleaning up Duplicate Tickets ---");
    const duplicates = await dataSource.query(`
    SELECT title, user_id, array_agg(id ORDER BY created_at ASC) as ids
    FROM accumulator_tickets
    GROUP BY title, user_id
    HAVING count(*) > 1
  `);

    let ticketsDeleted = 0;
    for (const dup of duplicates) {
        const ids = dup.ids;
        // Find which ID in the group has at least one purchase
        const purchaseCounts = await dataSource.query(`
      SELECT accumulator_id, count(*) as count
      FROM user_purchased_picks
      WHERE accumulator_id = ANY($1)
      GROUP BY accumulator_id
    `, [ids]);

        let idToKeep = ids[0]; // Default to oldest
        if (purchaseCounts.length > 0) {
            // Keep the one with the most purchases
            purchaseCounts.sort((a: any, b: any) => Number(b.count) - Number(a.count));
            idToKeep = purchaseCounts[0].accumulator_id;
        }

        const idsToDelete = ids.filter((id: number) => id !== idToKeep);
        if (idsToDelete.length > 0) {
            console.log(`Deleting duplicates for "${dup.title}" (User ${dup.user_id}). Keeping ID ${idToKeep}, deleting ${idsToDelete.length} others.`);

            // Delete dependents
            await dataSource.query(`DELETE FROM accumulator_picks WHERE accumulator_id = ANY($1)`, [idsToDelete]);
            await dataSource.query(`DELETE FROM pick_marketplace WHERE accumulator_id = ANY($1)`, [idsToDelete]);
            await dataSource.query(`DELETE FROM user_purchased_picks WHERE accumulator_id = ANY($1)`, [idsToDelete]);
            await dataSource.query(`DELETE FROM escrow_funds WHERE pick_id = ANY($1)`, [idsToDelete]);
            await dataSource.query(`DELETE FROM accumulator_tickets WHERE id = ANY($1)`, [idsToDelete]);
            ticketsDeleted += idsToDelete.length;
        }
    }
    console.log(`Deleted ${ticketsDeleted} duplicate tickets.`);

    await dataSource.destroy();
    console.log("\nCleanup finished.");
}

runCleanup().catch(err => {
    console.error("Cleanup failed:", err);
    process.exit(1);
});
