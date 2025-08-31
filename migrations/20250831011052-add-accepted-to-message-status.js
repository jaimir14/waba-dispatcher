'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add 'accepted' to the status enum in messages table
    await queryInterface.changeColumn('messages', 'status', {
      type: Sequelize.ENUM('pending', 'sent', 'delivered', 'read', 'failed', 'accepted'),
      allowNull: false,
      defaultValue: 'pending',
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove 'accepted' from the status enum
    await queryInterface.changeColumn('messages', 'status', {
      type: Sequelize.ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    });
  }
};
