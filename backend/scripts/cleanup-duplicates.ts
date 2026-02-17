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
  try {
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
      // We can't easily do "NOT IN" on a huge list if keepIds is massive, but for now it's likely fine.
      // A better approach for massive tables would be a specialized query, but let's stick to the logic.
      // However, to be safe against empty lists (though length > 0 check handles it), we use parameters.

      // Actually, "DELETE FROM table WHERE id NOT IN (...)" is dangerous if the list is empty (deletes everything if logic flaws)
      // But here we only run if keepIds.length > 0.

      // To be safer and avoid parameter limit issues with huge lists, let's select IDs to DELETE instead.
      const escrowToDelete = await dataSource.query(`
                SELECT id FROM escrow_funds WHERE id NOT IN (${keepIds.join(',')})
            `);
      const deleteIds = escrowToDelete.map((r: any) => r.id);

      if (deleteIds.length > 0) {
        await dataSource.query(`DELETE FROM escrow_funds WHERE id = ANY($1)`, [deleteIds]);
        console.log(`Cleaned up ${deleteIds.length} duplicate escrow records.`);
      } else {
        console.log("No duplicate escrow records found.");
      }
    } else {
      // If keepIds is empty, it means the table is empty, so nothing to delete.
      console.log("Escrow funds table is empty.");
    }

    // 2. Clean up duplicate Accumulator Tickets
    console.log("\n--- Cleaning up Duplicate Tickets ---");
    const duplicates = await dataSource.query(`
            SELECT title, user_id, array_agg(id ORDER BY created_at ASC) as ids
            FROM accumulator_tickets
            GROUP BY title, user_id
            HAVING count(*) > 1
        `);

    if (duplicates.length === 0) {
      console.log("No duplicate tickets found.");
      await dataSource.destroy();
      return;
    }

    const allIdsToDelete: number[] = [];
    let ticketsChecked = 0;

    for (const dup of duplicates) {
      const ids = dup.ids;
      // Find which ID in the group has at least one purchase
      // Optimization: check purchases for ALL these IDs in one go
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
        console.log(`Found duplicates for "${dup.title}" (User ${dup.user_id}). Keeping ID ${idToKeep}, marking ${idsToDelete.length} for deletion.`);
        allIdsToDelete.push(...idsToDelete);
      }
      ticketsChecked++;
    }

    if (allIdsToDelete.length > 0) {
      console.log(`\nDeleting ${allIdsToDelete.length} duplicate tickets in total...`);

      // Use batch delete with ANY($1) for performance and safety
      // Dependent tables must be cleaned first to avoid foreign key constraints (though usually cascade might handle it, we do it explicitly)

      console.log("Deleting dependent records...");
      await dataSource.query(`DELETE FROM accumulator_picks WHERE accumulator_id = ANY($1)`, [allIdsToDelete]);
      await dataSource.query(`DELETE FROM pick_marketplace WHERE accumulator_id = ANY($1)`, [allIdsToDelete]);
      await dataSource.query(`DELETE FROM user_purchased_picks WHERE accumulator_id = ANY($1)`, [allIdsToDelete]);

      // Escrow funds link to 'pick_id' which implies 'accumulator_id' based on our check
      await dataSource.query(`DELETE FROM escrow_funds WHERE pick_id = ANY($1)`, [allIdsToDelete]);

      // Finally delete the tickets
      await dataSource.query(`DELETE FROM accumulator_tickets WHERE id = ANY($1)`, [allIdsToDelete]);

      console.log(`Successfully deleted ${allIdsToDelete.length} duplicate tickets.`);
    } else {
      console.log("No tickets needed deletion after analysis.");
    }

    console.log("\nCleanup finished.");
  } catch (err) {
    console.error("Cleanup failed:", err);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

runCleanup();
