#!/usr/bin/env node

/**
 * Script to generate bcrypt hashed passwords for admin authentication
 *
 * Usage:
 *   node scripts/hash-password.js <password>
 *
 * Example:
 *   node scripts/hash-password.js MySecurePassword123!
 *
 * The output can be used as the ADMIN_PASSWORD or ADMIN_PASSWORD_HASH
 * environment variable in Vercel or your deployment platform.
 */

import bcrypt from 'bcryptjs';

async function hashPassword(password) {
    if (!password) {
        console.error('❌ Please provide a password as an argument');
        console.log('\nUsage: node scripts/hash-password.js <password>');
        console.log('Example: node scripts/hash-password.js MySecurePassword123!');
        process.exit(1);
    }

    try {
        // Generate salt and hash
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        console.log('\n✅ Password hashed successfully!\n');
        console.log('Original password:', password);
        console.log('Hashed password:', hashedPassword);
        console.log('\n📋 Environment variable setup:');
        console.log('----------------------------');
        console.log(`ADMIN_EMAIL=admin@pmpuzzle.com  # Your admin email (used for login)`);
        console.log(`ADMIN_PASSWORD=${hashedPassword}`);
        console.log(`ADMIN_USERNAME=Admin  # Display name (optional)`);
        console.log('\n💡 Tips:');
        console.log('- Set ADMIN_EMAIL to your actual email address for login');
        console.log('- Copy the hashed password above and set it as ADMIN_PASSWORD in Vercel');
        console.log('- ADMIN_USERNAME is optional and used for display purposes only');
        console.log('- The hash starts with $2 which indicates it\'s a bcrypt hash');
        console.log('- Never commit plain text passwords to your repository');

        // Test the hash to make sure it works
        const testResult = await bcrypt.compare(password, hashedPassword);
        if (testResult) {
            console.log('\n✅ Hash verification successful - the hash is valid!');
        } else {
            console.error('\n❌ Hash verification failed - something went wrong!');
        }

    } catch (error) {
        console.error('❌ Error hashing password:', error.message);
        process.exit(1);
    }
}

// Get password from command line argument
const password = process.argv[2];
hashPassword(password);