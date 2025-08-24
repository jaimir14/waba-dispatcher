require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// Database configuration
const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'waba_dispatcher',
  logging: false,
});

async function createTestCompany() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Create the test company
    const [company, created] = await sequelize.query(`
      INSERT INTO companies (id, name, api_key, is_active, settings, created_at, updated_at)
      VALUES (
        '550e8400-e29b-41d4-a716-446655440000',
        'testcompany',
        'testcompany_abcdefghijklmnopqrstuvwxyz123456',
        true,
        '{"webhook_url": "https://your-domain.com/webhook", "default_language": "es"}',
        NOW(),
        NOW()
      )
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        is_active = VALUES(is_active),
        settings = VALUES(settings),
        updated_at = NOW()
    `);

    console.log('✅ Test company created/updated successfully!');
    console.log('📋 Company Details:');
    console.log('   Name: testcompany');
    console.log('   API Key: testcompany_abcdefghijklmnopqrstuvwxyz123456');
    console.log('   Status: Active');
  } catch (error) {
    console.error('❌ Error creating test company:', error.message);
  } finally {
    await sequelize.close();
  }
}

createTestCompany();
