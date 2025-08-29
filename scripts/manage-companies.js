require('dotenv').config();
const { Sequelize } = require('sequelize');
const crypto = require('crypto');

// Database configuration
const config = require('../config/config.json');
const dbConfig = config.development;

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: false,
  }
);

// Company model definition
const Company = sequelize.define('Company', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: Sequelize.STRING(100),
    allowNull: false,
    unique: true,
  },
  apiKey: {
    type: Sequelize.STRING(255),
    allowNull: false,
    unique: true,
  },
  isActive: {
    type: Sequelize.BOOLEAN,
    defaultValue: true,
  },
  settings: {
    type: Sequelize.JSON,
    allowNull: true,
  },
}, {
  tableName: 'companies',
  timestamps: true,
  underscored: true,
});

function generateApiKey(companyName) {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(16).toString('hex');
  return `${companyName}_${random}`;
}

async function createCompany(name, isActive = true, settings = {}) {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    const apiKey = generateApiKey(name);
    
    const company = await Company.create({
      name,
      apiKey,
      isActive,
      settings: JSON.stringify(settings),
    });

    console.log('✅ Company created successfully!');
    console.log(`   Name: ${company.name}`);
    console.log(`   API Key: ${company.apiKey}`);
    console.log(`   Active: ${company.isActive}`);
    console.log(`   ID: ${company.id}`);
    
    return company;
  } catch (error) {
    console.error('❌ Error creating company:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

async function listCompanies() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    const companies = await Company.findAll({
      attributes: ['id', 'name', 'apiKey', 'isActive', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']],
    });

    if (companies.length === 0) {
      console.log('📭 No companies found.');
      return;
    }

    console.log(`📋 Found ${companies.length} company(ies):\n`);
    
    companies.forEach((company, index) => {
      console.log(`${index + 1}. ${company.name}`);
      console.log(`   ID: ${company.id}`);
      console.log(`   API Key: ${company.apiKey}`);
      console.log(`   Active: ${company.isActive}`);
      console.log(`   Created: ${company.createdAt.toISOString()}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error listing companies:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

async function updateCompany(name, updates) {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    const company = await Company.findOne({ where: { name } });
    if (!company) {
      console.error(`❌ Company "${name}" not found.`);
      return;
    }

    await company.update(updates);
    
    console.log('✅ Company updated successfully!');
    console.log(`   Name: ${company.name}`);
    console.log(`   API Key: ${company.apiKey}`);
    console.log(`   Active: ${company.isActive}`);
  } catch (error) {
    console.error('❌ Error updating company:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

async function deleteCompany(name) {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    const company = await Company.findOne({ where: { name } });
    if (!company) {
      console.error(`❌ Company "${name}" not found.`);
      return;
    }

    await company.destroy();
    
    console.log(`✅ Company "${name}" deleted successfully!`);
  } catch (error) {
    console.error('❌ Error deleting company:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Command line interface
const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'create':
    if (args.length < 1) {
      console.log('Usage: node scripts/manage-companies.js create <company_name> [active] [settings_json]');
      console.log('Example: node scripts/manage-companies.js create "mycompany" true \'{"metaPhoneNumberId":"123456"}\'');
      process.exit(1);
    }
    
    const name = args[0];
    const isActive = args[1] !== 'false';
    const settings = args[2] ? JSON.parse(args[2]) : {};
    
    createCompany(name, isActive, settings);
    break;

  case 'list':
    listCompanies();
    break;

  case 'update':
    if (args.length < 2) {
      console.log('Usage: node scripts/manage-companies.js update <company_name> <field> <value>');
      console.log('Example: node scripts/manage-companies.js update "mycompany" isActive false');
      process.exit(1);
    }
    
    const updateName = args[0];
    const field = args[1];
    const value = args[2];
    
    const updates = { [field]: value };
    updateCompany(updateName, updates);
    break;

  case 'delete':
    if (args.length < 1) {
      console.log('Usage: node scripts/manage-companies.js delete <company_name>');
      console.log('Example: node scripts/manage-companies.js delete "mycompany"');
      process.exit(1);
    }
    
    const deleteName = args[0];
    deleteCompany(deleteName);
    break;

  default:
    console.log('Company Management Script');
    console.log('');
    console.log('Commands:');
    console.log('  create <name> [active] [settings]  - Create a new company');
    console.log('  list                               - List all companies');
    console.log('  update <name> <field> <value>     - Update company field');
    console.log('  delete <name>                      - Delete company');
    console.log('');
    console.log('Examples:');
    console.log('  npm run company:create mycompany');
    console.log('  npm run company:list');
    console.log('  npm run company:update mycompany isActive false');
    console.log('  npm run company:delete mycompany');
    break;
}
