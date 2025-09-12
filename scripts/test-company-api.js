require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';
const ADMIN_API_KEY =
  process.env.ADMIN_API_KEY || 'admin_super_secret_key_change_in_production';

async function testCompanyAPI() {
  try {
    console.log('🏢 Testing Company CRUD API...\n');

    let companyId = null;

    // Step 1: Create a company
    console.log('📝 Step 1: Creating a new company...');
    try {
      const createResponse = await axios.post(
        `${API_BASE_URL}/companies`,
        {
          name: 'TestCompanyAPI',
          isActive: true,
          settings: {
            metaPhoneNumberId: '123456789',
            customField: 'test_value',
          },
        },
        {
          headers: {
            'X-Admin-Key': ADMIN_API_KEY,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('   ✅ Status:', createResponse.data.status);
      console.log('   📝 Message:', createResponse.data.message);
      if (createResponse.data.data) {
        companyId = createResponse.data.data.id;
        console.log('   🆔 Company ID:', companyId);
        console.log('   🔑 API Key:', createResponse.data.data.apiKey);
      }
    } catch (error) {
      console.log(
        '   ❌ Error:',
        error.response?.data?.message || error.message,
      );
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Step 2: Get all companies
    console.log('📋 Step 2: Getting all companies...');
    try {
      const listResponse = await axios.get(
        `${API_BASE_URL}/companies?sortBy=name&sortOrder=ASC`,
        {
          headers: {
            'X-Admin-Key': ADMIN_API_KEY,
          },
        },
      );

      console.log('   ✅ Status:', listResponse.data.status);
      console.log('   📊 Total Companies:', listResponse.data.total);
      console.log('   📝 Message:', listResponse.data.message);
    } catch (error) {
      console.log(
        '   ❌ Error:',
        error.response?.data?.message || error.message,
      );
    }

    console.log('\n' + '='.repeat(50) + '\n');

    if (companyId) {
      // Step 3: Get company by ID
      console.log('🔍 Step 3: Getting company by ID...');
      try {
        const getResponse = await axios.get(
          `${API_BASE_URL}/companies/${companyId}`,
          {
            headers: {
              'X-Admin-Key': ADMIN_API_KEY,
            },
          },
        );

        console.log('   ✅ Status:', getResponse.data.status);
        console.log('   📝 Company Name:', getResponse.data.data?.name);
        console.log('   🔄 Is Active:', getResponse.data.data?.isActive);
      } catch (error) {
        console.log(
          '   ❌ Error:',
          error.response?.data?.message || error.message,
        );
      }

      console.log('\n' + '='.repeat(50) + '\n');

      // Step 4: Update company
      console.log('✏️ Step 4: Updating company...');
      try {
        const updateResponse = await axios.put(
          `${API_BASE_URL}/companies/${companyId}`,
          {
            name: 'TestCompanyAPI_Updated',
            settings: {
              metaPhoneNumberId: '987654321',
              updatedField: 'new_value',
            },
          },
          {
            headers: {
              'X-Admin-Key': ADMIN_API_KEY,
              'Content-Type': 'application/json',
            },
          },
        );

        console.log('   ✅ Status:', updateResponse.data.status);
        console.log('   📝 Message:', updateResponse.data.message);
        console.log('   🏷️ Updated Name:', updateResponse.data.data?.name);
      } catch (error) {
        console.log(
          '   ❌ Error:',
          error.response?.data?.message || error.message,
        );
      }

      console.log('\n' + '='.repeat(50) + '\n');

      // Step 5: Deactivate company
      console.log('⏸️ Step 5: Deactivating company...');
      try {
        const deactivateResponse = await axios.patch(
          `${API_BASE_URL}/companies/${companyId}/deactivate`,
          {},
          {
            headers: {
              'X-Admin-Key': ADMIN_API_KEY,
            },
          },
        );

        console.log('   ✅ Status:', deactivateResponse.data.status);
        console.log('   📝 Message:', deactivateResponse.data.message);
        console.log('   🔄 Is Active:', deactivateResponse.data.data?.isActive);
      } catch (error) {
        console.log(
          '   ❌ Error:',
          error.response?.data?.message || error.message,
        );
      }

      console.log('\n' + '='.repeat(50) + '\n');

      // Step 6: Activate company
      console.log('▶️ Step 6: Activating company...');
      try {
        const activateResponse = await axios.patch(
          `${API_BASE_URL}/companies/${companyId}/activate`,
          {},
          {
            headers: {
              'X-Admin-Key': ADMIN_API_KEY,
            },
          },
        );

        console.log('   ✅ Status:', activateResponse.data.status);
        console.log('   📝 Message:', activateResponse.data.message);
        console.log('   🔄 Is Active:', activateResponse.data.data?.isActive);
      } catch (error) {
        console.log(
          '   ❌ Error:',
          error.response?.data?.message || error.message,
        );
      }

      console.log('\n' + '='.repeat(50) + '\n');

      // Step 7: Soft delete company
      console.log('🗑️ Step 7: Soft deleting company...');
      try {
        const deleteResponse = await axios.delete(
          `${API_BASE_URL}/companies/${companyId}`,
          {
            headers: {
              'X-Admin-Key': ADMIN_API_KEY,
            },
          },
        );

        console.log('   ✅ Status:', deleteResponse.data.status);
        console.log('   📝 Message:', deleteResponse.data.message);
      } catch (error) {
        console.log(
          '   ❌ Error:',
          error.response?.data?.message || error.message,
        );
      }

      console.log('\n' + '='.repeat(50) + '\n');

      // Step 8: Get companies including deleted
      console.log('👻 Step 8: Getting companies including deleted...');
      try {
        const listWithDeletedResponse = await axios.get(
          `${API_BASE_URL}/companies?includeDeleted=true`,
          {
            headers: {
              'X-Admin-Key': ADMIN_API_KEY,
            },
          },
        );

        console.log('   ✅ Status:', listWithDeletedResponse.data.status);
        console.log(
          '   📊 Total Companies (including deleted):',
          listWithDeletedResponse.data.total,
        );
        const deletedCompany = listWithDeletedResponse.data.data?.find(
          c => c.id === companyId,
        );
        console.log(
          '   🗓️ Deleted At:',
          deletedCompany?.deletedAt || 'Not found',
        );
      } catch (error) {
        console.log(
          '   ❌ Error:',
          error.response?.data?.message || error.message,
        );
      }

      console.log('\n' + '='.repeat(50) + '\n');

      // Step 9: Restore company
      console.log('♻️ Step 9: Restoring company...');
      try {
        const restoreResponse = await axios.patch(
          `${API_BASE_URL}/companies/${companyId}/restore`,
          {},
          {
            headers: {
              'X-Admin-Key': ADMIN_API_KEY,
            },
          },
        );

        console.log('   ✅ Status:', restoreResponse.data.status);
        console.log('   📝 Message:', restoreResponse.data.message);
        console.log('   🔄 Is Active:', restoreResponse.data.data?.isActive);
        console.log(
          '   🗓️ Deleted At:',
          restoreResponse.data.data?.deletedAt || 'null (restored)',
        );
      } catch (error) {
        console.log(
          '   ❌ Error:',
          error.response?.data?.message || error.message,
        );
      }

      console.log('\n' + '='.repeat(50) + '\n');

      // Step 10: Permanently delete company
      console.log('💥 Step 10: Permanently deleting company...');
      try {
        const permanentDeleteResponse = await axios.delete(
          `${API_BASE_URL}/companies/${companyId}/permanent`,
          {
            headers: {
              'X-Admin-Key': ADMIN_API_KEY,
            },
          },
        );

        console.log('   ✅ Status:', permanentDeleteResponse.data.status);
        console.log('   📝 Message:', permanentDeleteResponse.data.message);
      } catch (error) {
        console.log(
          '   ❌ Error:',
          error.response?.data?.message || error.message,
        );
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Additional info
    console.log('ℹ️  Company API Information:');
    console.log('   🔐 Admin Key Required: X-Admin-Key header');
    console.log('   🌐 Base URL: http://localhost:3000/companies');
    console.log('   📋 Available Endpoints:');
    console.log('      - POST /companies (Create)');
    console.log('      - GET /companies (List with filtering)');
    console.log('      - GET /companies/:id (Get by ID)');
    console.log('      - PUT /companies/:id (Update)');
    console.log('      - DELETE /companies/:id (Soft delete)');
    console.log('      - PATCH /companies/:id/activate (Activate)');
    console.log('      - PATCH /companies/:id/deactivate (Deactivate)');
    console.log('      - PATCH /companies/:id/status (Update status)');
    console.log('      - PATCH /companies/:id/restore (Restore deleted)');
    console.log('      - DELETE /companies/:id/permanent (Permanent delete)');
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('🔍 Response:', error.response.data);
    }
  }
}

// Run the test
console.log('🚀 Starting Company API test...\n');
testCompanyAPI()
  .then(() => {
    console.log('\n✅ Company API test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
