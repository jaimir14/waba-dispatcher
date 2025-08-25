'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lists', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      conversation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'conversations',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to the conversation where this list was sent',
      },
      list_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'External list identifier from the request',
      },
      status: {
        type: Sequelize.ENUM('pending', 'accepted', 'rejected', 'expired'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Current status of the list interaction',
      },
      accepted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the list was accepted by the user',
      },
      rejected_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the list was rejected by the user',
      },
      expired_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the list expired',
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata about the list',
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

    // Add indexes for performance optimization
    await queryInterface.addIndex('lists', ['conversation_id']);
    await queryInterface.addIndex('lists', ['list_id']);
    await queryInterface.addIndex('lists', ['status']);
    await queryInterface.addIndex('lists', ['conversation_id', 'status']);
    await queryInterface.addIndex('lists', ['conversation_id', 'created_at']);
    await queryInterface.addIndex('lists', ['status', 'created_at']);

    // Composite index for efficient queries when marking pending lists as accepted
    await queryInterface.addIndex('lists', [
      'conversation_id',
      'status',
      'created_at',
    ]);

    // Unique constraint to prevent duplicate list_id per conversation
    await queryInterface.addIndex('lists', ['conversation_id', 'list_id'], {
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('lists');
  },
};
