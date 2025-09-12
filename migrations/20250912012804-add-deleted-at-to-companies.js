'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('companies', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment:
        'Timestamp when the company was soft deleted (null if not deleted)',
    });

    // Add index for better performance on deleted_at queries
    await queryInterface.addIndex('companies', ['deleted_at'], {
      name: 'idx_companies_deleted_at',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('companies', 'idx_companies_deleted_at');

    // Remove column
    await queryInterface.removeColumn('companies', 'deleted_at');
  },
};
