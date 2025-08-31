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
import { Company } from './company.model';

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  ACCEPTED = 'accepted',
}

@Table({
  tableName: 'messages',
  timestamps: true,
  underscored: true,
})
export class Message extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => Company)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  company_id: string;

  @BelongsTo(() => Company)
  company: Company;

  @Index
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'WhatsApp Cloud API message ID',
  })
  whatsapp_message_id: string;

  @Index
  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    comment: 'Recipient phone number',
  })
  to_phone_number: string;

  @Index
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'Reference to the list_id from lists table for list messages',
  })
  list_id: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    comment: 'WhatsApp template name',
  })
  template_name: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Template parameters as JSON',
  })
  parameters: Record<string, any>;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(MessageStatus)),
    allowNull: false,
    defaultValue: MessageStatus.PENDING,
  })
  status: MessageStatus;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    comment: 'WhatsApp API error code if failed',
  })
  error_code: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Error description',
  })
  error_message: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'WhatsApp pricing information',
  })
  pricing: Record<string, any>;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'When message was sent to WhatsApp API',
  })
  sent_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'When message was delivered to recipient',
  })
  delivered_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'When message was read by recipient',
  })
  read_at: Date;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
}
