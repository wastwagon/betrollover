import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    synchronize: false,
    logging: true,
});

async function cleanup() {
    try {
        await dataSource.initialize();
        console.log('Database connected.');

        // Find dates with duplicates
        const duplicates = await dataSource.query(`
      SELECT date, COUNT(*) 
      FROM smart_coupons 
      GROUP BY date 
      HAVING COUNT(*) > 1
    `);

        console.log(`Found ${duplicates.length} dates with duplicate coupons.`);

        for (const d of duplicates) {
            console.log(`Cleaning up date: ${d.date} (${d.count} entries)`);

            // Keep the one with highest ID (latest created usually)
            const rows = await dataSource.query(
                `SELECT id FROM smart_coupons WHERE date = $1 ORDER BY id DESC`,
                [d.date]
            );

            const keepId = rows[0].id;
            const deleteIds = rows.slice(1).map((r: any) => r.id);

            if (deleteIds.length > 0) {
                console.log(`Keeping ID ${keepId}, deleting IDs: ${deleteIds.join(', ')}`);
                await dataSource.query(
                    `DELETE FROM smart_coupons WHERE id = ANY($1)`,
                    [deleteIds]
                );
            }
        }

        console.log('Cleanup complete.');
    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        await dataSource.destroy();
    }
}

cleanup();
