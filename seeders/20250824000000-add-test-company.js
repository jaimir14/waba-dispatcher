'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      'companies',
      [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'testcompany',
          api_key: 'testcompany_abcdefghijklmnopqrstuvwxyz123456',
          is_active: true,
          settings: JSON.stringify({
            webhook_url: 'https://your-domain.com/webhook',
            default_language: 'es',
          }),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      {},
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      'companies',
      {
        name: 'testcompany',
      },
      {},
    );
  },
};
