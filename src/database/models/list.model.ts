import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Conversation } from './conversation.model';

export enum ListStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Table({
  tableName: 'lists',
  timestamps: true,
  underscored: true,
})
export class List extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @ForeignKey(() => Conversation)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: false,
    comment: 'Reference to the conversation where this list was sent',
  })
  conversation_id: string;

  @BelongsTo(() => Conversation)
  conversation: Conversation;

  @Index
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    comment: 'External list identifier from the request',
  })
  list_id: string;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(ListStatus)),
    allowNull: false,
    defaultValue: ListStatus.PENDING,
    comment: 'Current status of the list interaction',
  })
  status: ListStatus;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'When the list was accepted by the user',
  })
  accepted_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'When the list was rejected by the user',
  })
  rejected_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'When the list expired',
  })
  expired_at: Date;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Additional metadata about the list',
  })
  metadata: Record<string, any>;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
} 