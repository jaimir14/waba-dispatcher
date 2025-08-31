import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { MessageRepository } from './message.repository';
import { Message, MessageStatus } from '../models/message.model';
import { ConfigService } from '../../config/config.service';

describe('MessageRepository', () => {
  let repository: MessageRepository;
  let mockMessageModel: jest.Mocked<typeof Message>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockMessageModel = {
      create: jest.fn(),
      findByPk: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
    } as any;

    mockConfigService = {
      whatsappCostPerMessage: 0.08,
      whatsappCurrency: 'USD',
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageRepository,
        {
          provide: getModelToken(Message),
          useValue: mockMessageModel,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    repository = module.get<MessageRepository>(MessageRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should set default pricing when creating a message without pricing', async () => {
      const messageData = {
        company_id: 'test-company-id',
        to_phone_number: '+50688776655',
        template_name: 'test_template',
        status: MessageStatus.PENDING,
      };

      const expectedPricing = {
        cost: 0.08,
        currency: 'USD',
        created_at: expect.any(Date),
        source: 'environment_default',
      };

      const expectedMessageData = {
        ...messageData,
        pricing: expectedPricing,
      };

      mockMessageModel.create.mockResolvedValue({
        ...expectedMessageData,
        id: 1,
        created_at: new Date(),
        updated_at: new Date(),
      } as any);

      const result = await repository.create(messageData);

      expect(mockMessageModel.create).toHaveBeenCalledWith(expectedMessageData);
      expect(result).toBeDefined();
    });

    it('should not override existing pricing when creating a message with pricing', async () => {
      const existingPricing = {
        cost: 0.05,
        currency: 'USD',
      };

      const messageData = {
        company_id: 'test-company-id',
        to_phone_number: '+50688776655',
        template_name: 'test_template',
        status: MessageStatus.PENDING,
        pricing: existingPricing,
      };

      mockMessageModel.create.mockResolvedValue({
        ...messageData,
        id: 1,
        created_at: new Date(),
        updated_at: new Date(),
      } as any);

      const result = await repository.create(messageData);

      expect(mockMessageModel.create).toHaveBeenCalledWith(messageData);
      expect(result).toBeDefined();
    });
  });
});
