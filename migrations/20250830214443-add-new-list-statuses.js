'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add new enum values to the status column
    await queryInterface.changeColumn('lists', 'status', {
      type: Sequelize.ENUM(
        'pending',
        'sent',
        'delivered',
        'read',
        'accepted',
        'failed',
        'rejected',
        'expired'
      ),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Current status of the list interaction',
    });
  },

  async down (queryInterface, Sequelize) {
    // Revert to original enum values
    await queryInterface.changeColumn('lists', 'status', {
      type: Sequelize.ENUM(
        'pending',
        'accepted',
        'rejected',
        'expired'
      ),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Current status of the list interaction',
    });
  }
};
