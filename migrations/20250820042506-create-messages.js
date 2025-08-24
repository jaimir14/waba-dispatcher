'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('messages', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
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
      whatsapp_message_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'WhatsApp Cloud API message ID',
      },
      to_phone_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Recipient phone number',
      },
      template_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'WhatsApp template name',
      },
      parameters: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Template parameters as JSON',
      },
      status: {
        type: Sequelize.ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      error_code: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'WhatsApp API error code if failed',
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error description',
      },
      pricing: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'WhatsApp pricing information',
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When message was sent to WhatsApp API',
      },
      delivered_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When message was delivered to recipient',
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When message was read by recipient',
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
    await queryInterface.addIndex('messages', ['company_id']);
    await queryInterface.addIndex('messages', ['to_phone_number']);
    await queryInterface.addIndex('messages', ['status']);
    await queryInterface.addIndex('messages', ['whatsapp_message_id']);
    await queryInterface.addIndex('messages', ['created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('messages');
  },
};
