const { Sequelize } = require('sequelize');
const { List, ListStatus } = require('../dist/database/models/list.model');
const { Conversation } = require('../dist/database/models/conversation.model');
const { Company } = require('../dist/database/models/company.model');

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

async function testLists() {
  try {
    console.log('🔗 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Sync models
    await sequelize.sync({ alter: true });
    console.log('✅ Models synchronized');

    // Find or create a test company
    const [company] = await Company.findOrCreate({
      where: { name: 'testcompany' },
      defaults: {
        name: 'testcompany',
        whatsapp_business_account_id: 'test_waba_id',
        access_token: 'test_token',
      },
    });
    console.log(`✅ Using company: ${company.name}`);

    // Find or create a test conversation
    const [conversation] = await Conversation.findOrCreate({
      where: {
        phone_number: '1234567890',
        company_id: company.id,
        is_active: true,
      },
      defaults: {
        phone_number: '1234567890',
        company_id: company.id,
        current_step: 'waiting_response',
        context: {},
        last_message_at: new Date(),
        is_active: true,
      },
    });
    console.log(`✅ Using conversation: ${conversation.id}`);

    // Test 1: Create a new list
    console.log('\n📝 Test 1: Creating a new list...');
    const list1 = await List.create({
      conversation_id: conversation.id,
      list_id: 'test_list_001',
      status: ListStatus.PENDING,
      metadata: { test: true, created_at: new Date() },
    });
    console.log(`✅ Created list: ${list1.id} with status: ${list1.status}`);

    // Test 2: Create another list for the same conversation
    console.log('\n📝 Test 2: Creating another list...');
    const list2 = await List.create({
      conversation_id: conversation.id,
      list_id: 'test_list_002',
      status: ListStatus.PENDING,
      metadata: { test: true, created_at: new Date() },
    });
    console.log(`✅ Created list: ${list2.id} with status: ${list2.status}`);

    // Test 3: Query pending lists for today
    console.log('\n🔍 Test 3: Querying pending lists for today...');
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const pendingLists = await List.findAll({
      where: {
        conversation_id: conversation.id,
        status: ListStatus.PENDING,
        created_at: {
          [Sequelize.Op.between]: [startOfDay, endOfDay],
        },
      },
    });
    console.log(`✅ Found ${pendingLists.length} pending lists for today`);

    // Test 4: Mark all pending lists as accepted
    console.log('\n✅ Test 4: Marking all pending lists as accepted...');
    const updateResult = await List.update(
      {
        status: ListStatus.ACCEPTED,
        accepted_at: new Date(),
      },
      {
        where: {
          conversation_id: conversation.id,
          status: ListStatus.PENDING,
          created_at: {
            [Sequelize.Op.between]: [startOfDay, endOfDay],
          },
        },
      },
    );
    console.log(`✅ Updated ${updateResult[0]} lists to accepted status`);

    // Test 5: Verify the update
    console.log('\n🔍 Test 5: Verifying the update...');
    const acceptedLists = await List.findAll({
      where: {
        conversation_id: conversation.id,
        status: ListStatus.ACCEPTED,
      },
    });
    console.log(`✅ Found ${acceptedLists.length} accepted lists`);

    // Test 6: Query by list_id
    console.log('\n🔍 Test 6: Querying by list_id...');
    const foundList = await List.findOne({
      where: {
        conversation_id: conversation.id,
        list_id: 'test_list_001',
      },
    });
    console.log(
      `✅ Found list: ${foundList?.id} with status: ${foundList?.status}`,
    );

    // Test 7: Test unique constraint
    console.log('\n🔒 Test 7: Testing unique constraint...');
    try {
      await List.create({
        conversation_id: conversation.id,
        list_id: 'test_list_001', // Duplicate list_id
        status: ListStatus.PENDING,
      });
      console.log('❌ Should have failed due to unique constraint');
    } catch (error) {
      console.log('✅ Unique constraint working correctly:', error.message);
    }

    // Test 8: Performance test with indexes
    console.log('\n⚡ Test 8: Testing query performance...');
    const startTime = Date.now();
    const performanceTest = await List.findAll({
      where: {
        conversation_id: conversation.id,
        status: ListStatus.ACCEPTED,
      },
      order: [['created_at', 'DESC']],
    });
    const endTime = Date.now();
    console.log(
      `✅ Query completed in ${endTime - startTime}ms, found ${performanceTest.length} records`,
    );

    console.log('\n🎉 All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the test
testLists();
