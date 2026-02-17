import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';

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

async function checkAndCreateAdmin() {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Connected.');

    try {
        // Check for existing admin users
        const admins = await dataSource.query(`
            SELECT id, email, role FROM users WHERE role = 'admin'
        `);

        console.log(`\n📊 Found ${admins.length} admin user(s):`);
        admins.forEach((admin: any) => {
            console.log(`   - ID: ${admin.id}, Email: ${admin.email}`);
        });

        // Check total user count
        const userCount = await dataSource.query(`
            SELECT COUNT(*) as count FROM users
        `);
        console.log(`\n👥 Total users in database: ${userCount[0].count}`);

        // If no admin exists, offer to create one
        if (admins.length === 0) {
            console.log('\n⚠️  WARNING: No admin users found!');
            console.log('Creating default admin user...');

            const defaultPassword = 'Admin@123456'; // User should change this immediately
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);

            const result = await dataSource.query(`
                INSERT INTO users (email, password, role, is_verified, created_at, updated_at)
                VALUES ($1, $2, $3, $4, NOW(), NOW())
                RETURNING id, email, role
            `, ['admin@betrollover.com', hashedPassword, 'admin', true]);

            console.log('✅ Admin user created:');
            console.log(`   Email: admin@betrollover.com`);
            console.log(`   Password: ${defaultPassword}`);
            console.log('\n⚠️  IMPORTANT: Change this password immediately after logging in!');

            // Create wallet for admin
            await dataSource.query(`
                INSERT INTO user_wallets (user_id, balance, status, created_at, updated_at)
                VALUES ($1, 0.00, 'active', NOW(), NOW())
                ON CONFLICT (user_id) DO NOTHING
            `, [result[0].id]);

            console.log('✅ Admin wallet created.');
        } else {
            console.log('\n✅ Admin user(s) exist. No action needed.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await dataSource.destroy();
    }
}

checkAndCreateAdmin();
