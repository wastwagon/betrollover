import * as bcrypt from 'bcrypt';

async function testPassword() {
    const password = 'Admin@123456';

    console.log('Testing password hashing for:', password);
    console.log('');

    // Generate hash
    const hash = await bcrypt.hash(password, 10);
    console.log('Generated hash:', hash);
    console.log('');

    // Test comparison
    const isMatch = await bcrypt.compare(password, hash);
    console.log('Password matches hash?', isMatch);
    console.log('');

    // Test with wrong password
    const wrongMatch = await bcrypt.compare('WrongPassword', hash);
    console.log('Wrong password matches?', wrongMatch);
    console.log('');

    console.log('✅ Hash is valid! Use this SQL to update the admin password:');
    console.log('');
    console.log(`UPDATE users SET password = '${hash}' WHERE email = 'admin@betrollover.com';`);
}

testPassword();
