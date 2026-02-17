import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables from .env.tunnel for production connection
dotenv.config({ path: '.env.tunnel' });

async function resetAdminPassword() {
    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5434'),
        username: process.env.POSTGRES_USER || 'betrollover',
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB || 'betrollover',
    });

    try {
        console.log('🔌 Connecting to database...');
        await dataSource.initialize();
        console.log('✅ Connected.\n');

        // The password you want to set
        const newPassword = 'Admin@123456';

        console.log(`🔐 Hashing password: ${newPassword}`);
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        console.log(`✅ Hash generated: ${hashedPassword}\n`);

        // Update admin password
        console.log('📝 Updating admin password in database...');
        const result = await dataSource.query(
            `UPDATE users SET password = $1 WHERE email = 'admin@betrollover.com' RETURNING id, email, role`,
            [hashedPassword]
        );

        if (result.length > 0) {
            console.log('✅ Password updated successfully!');
            console.log(`   User: ${result[0].email}`);
            console.log(`   Role: ${result[0].role}`);
            console.log(`\n🔑 New credentials:`);
            console.log(`   Email: admin@betrollover.com`);
            console.log(`   Password: ${newPassword}`);
        } else {
            console.log('❌ No admin user found with email: admin@betrollover.com');
        }

        await dataSource.destroy();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

resetAdminPassword();
