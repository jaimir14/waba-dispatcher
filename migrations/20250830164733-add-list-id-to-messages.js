'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add list_id column to messages table
    await queryInterface.addColumn('messages', 'list_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Reference to the list_id from lists table for list messages',
    });

    // Add index for performance
    await queryInterface.addIndex('messages', ['list_id']);

    // Add composite index for efficient queries
    await queryInterface.addIndex('messages', ['list_id', 'status']);
    await queryInterface.addIndex('messages', ['list_id', 'created_at']);
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('messages', ['list_id', 'created_at']);
    await queryInterface.removeIndex('messages', ['list_id', 'status']);
    await queryInterface.removeIndex('messages', ['list_id']);

    // Remove the column
    await queryInterface.removeColumn('messages', 'list_id');
  },
};
