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
}
