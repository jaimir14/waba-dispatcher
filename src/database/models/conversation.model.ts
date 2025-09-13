import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  Index,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Company } from './company.model';
import { List } from './list.model';

@Table({
  tableName: 'conversations',
  timestamps: true,
  underscored: true,
})
export class Conversation extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @ForeignKey(() => Company)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  company_id: string;

  @BelongsTo(() => Company)
  company: Company;

  @HasMany(() => List)
  lists: List[];

  @Index
  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    comment: 'Customer phone number',
  })
  phone_number: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    comment: 'Current conversation step',
  })
  current_step: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Conversation context and data',
  })
  context: Record<string, any>;

  @Index
  @Column({
    type: DataType.DATE,
    allowNull: false,
    comment: 'Last message timestamp',
  })
  last_message_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'When the session started',
  })
  session_started_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'When the session expires (24 hours from last interaction)',
  })
  session_expires_at: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether conversation is active',
  })
  is_active: boolean;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  /**
   * Check if the conversation session has expired
   * @returns true if the session has expired, false otherwise
   */
  isExpired(): boolean {
    if (!this.session_expires_at) {
      // If no expiration time is set, consider it expired
      return true;
    }
    
    const now = new Date();
    return this.session_expires_at <= now;
  }

  /**
   * Check if the conversation session will expire within a given number of hours
   * @param hours - Number of hours to check ahead (default: 4)
   * @returns true if the session will expire within the specified hours
   */
  isExpiringSoon(hours: number = 4): boolean {
    if (!this.session_expires_at) {
      // If no expiration time is set, consider it expiring soon
      return true;
    }
    
    const now = new Date();
    const thresholdTime = new Date(now.getTime() + (hours * 60 * 60 * 1000));
    return this.session_expires_at <= thresholdTime;
  }
}
