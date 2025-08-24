'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('conversations', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      phone_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Customer phone number',
      },
      current_step: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Current conversation step',
      },
      context: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Conversation context and data',
      },
      last_message_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Last message timestamp',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether conversation is active',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('conversations', ['company_id']);
    await queryInterface.addIndex('conversations', ['phone_number']);
    await queryInterface.addIndex('conversations', ['is_active']);
    await queryInterface.addIndex('conversations', ['last_message_at']);
    
    // Add unique constraint for active conversations per company/phone
    await queryInterface.addIndex('conversations', ['company_id', 'phone_number', 'is_active'], {
      unique: true,
      where: { is_active: true },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('conversations');
  },
};
