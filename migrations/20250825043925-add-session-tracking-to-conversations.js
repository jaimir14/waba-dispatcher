'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('conversations', 'session_started_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When the session started',
    });

    await queryInterface.addColumn('conversations', 'session_expires_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When the session expires (24 hours from last interaction)',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('conversations', 'session_started_at');
    await queryInterface.removeColumn('conversations', 'session_expires_at');
  },
};
