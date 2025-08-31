import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { QueueService, WhatsAppSendJobData } from './queue.service';
import { ConfigService } from '../config/config.service';
import { Queue, JobOptions } from 'bull';

describe('QueueService', () => {
  let service: QueueService;
  let mockQueue: jest.Mocked<Queue>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn(),
      addBulk: jest.fn(),
      getWaiting: jest.fn(),
      getActive: jest.fn(),
      getCompleted: jest.fn(),
      getFailed: jest.fn(),
      getDelayed: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      empty: jest.fn(),
    } as any;

    mockConfigService = {
      queueDefaultJobAttempts: 3,
      queueDefaultJobDelay: 0,
      queueDefaultJobBackoffDelay: 5000,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getQueueToken('whatsapp-send'),
          useValue: mockQueue,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addWhatsAppSendJob', () => {
    const jobData: WhatsAppSendJobData = {
      companyId: 'test-company',
      to: '+50688776655',
      templateName: 'test_template',
      parameters: ['param1', 'param2'],
    };

    it('should add a job to the queue with default options', async () => {
      const mockJob = { id: 'job-123' };
      mockQueue.add.mockResolvedValue(mockJob as any);

      await service.addWhatsAppSendJob(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-whatsapp-message',
        jobData,
        expect.objectContaining({
          attempts: 3,
          delay: 0,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          priority: 0,
        }),
      );
    });

    it('should add a high priority job with zero delay', async () => {
      const highPriorityJobData = { ...jobData, priority: 1 };
      const mockJob = { id: 'job-123' };
      mockQueue.add.mockResolvedValue(mockJob as any);

      await service.addWhatsAppSendJob(highPriorityJobData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-whatsapp-message',
        highPriorityJobData,
        expect.objectContaining({
          delay: 0,
          priority: 1,
        }),
      );
    });

    it('should use custom job options when provided', async () => {
      const customOptions: Partial<JobOptions> = {
        attempts: 5,
        delay: 1000,
      };
      const mockJob = { id: 'job-123' };
      mockQueue.add.mockResolvedValue(mockJob as any);

      await service.addWhatsAppSendJob(jobData, customOptions);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-whatsapp-message',
        jobData,
        expect.objectContaining(customOptions),
      );
    });

    it('should throw error when queue fails', async () => {
      mockQueue.add.mockRejectedValue(new Error('Queue error'));

      await expect(service.addWhatsAppSendJob(jobData)).rejects.toThrow(
        'Queue error',
      );
    });
  });

  describe('addBulkWhatsAppSendJobs', () => {
    const jobs = [
      {
        data: {
          companyId: 'test-company',
          to: '+50688776655',
          templateName: 'test_template',
          parameters: ['param1'],
        } as WhatsAppSendJobData,
      },
      {
        data: {
          companyId: 'test-company',
          to: '+50688888888',
          templateName: 'test_template',
          parameters: ['param2'],
        } as WhatsAppSendJobData,
      },
    ];

    it('should add bulk jobs to the queue', async () => {
      const mockJobs = [{ id: 'job-1' }, { id: 'job-2' }];
      mockQueue.addBulk.mockResolvedValue(mockJobs as any);

      await service.addBulkWhatsAppSendJobs(jobs);

      expect(mockQueue.addBulk).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'send-whatsapp-message',
            data: jobs[0].data,
            opts: expect.objectContaining({
              attempts: 3,
              priority: 0,
            }),
          }),
          expect.objectContaining({
            name: 'send-whatsapp-message',
            data: jobs[1].data,
            opts: expect.objectContaining({
              attempts: 3,
              priority: 0,
            }),
          }),
        ]),
      );
    });

    it('should handle high priority bulk jobs with staggered delays', async () => {
      const highPriorityJobs = jobs.map(job => ({
        ...job,
        data: { ...job.data, priority: 1 },
      }));
      const mockJobs = [{ id: 'job-1' }, { id: 'job-2' }];
      mockQueue.addBulk.mockResolvedValue(mockJobs as any);

      await service.addBulkWhatsAppSendJobs(highPriorityJobs);

      expect(mockQueue.addBulk).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            opts: expect.objectContaining({
              delay: 0, // First job gets zero delay
              priority: 1,
            }),
          }),
          expect.objectContaining({
            opts: expect.objectContaining({
              delay: 100, // Second job gets 100ms delay
              priority: 1,
            }),
          }),
        ]),
      );
    });

    it('should throw error when bulk queue fails', async () => {
      mockQueue.addBulk.mockRejectedValue(new Error('Bulk queue error'));

      await expect(service.addBulkWhatsAppSendJobs(jobs)).rejects.toThrow(
        'Bulk queue error',
      );
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      mockQueue.getWaiting.mockResolvedValue([1, 2] as any);
      mockQueue.getActive.mockResolvedValue([1] as any);
      mockQueue.getCompleted.mockResolvedValue([1, 2, 3] as any);
      mockQueue.getFailed.mockResolvedValue([1, 2] as any);
      mockQueue.getDelayed.mockResolvedValue([1] as any);

      const stats = await service.getQueueStats();

      expect(stats).toEqual({
        waiting: 2,
        active: 1,
        completed: 3,
        failed: 2,
        delayed: 1,
      });
    });
  });

  describe('queue management', () => {
    it('should pause the queue', async () => {
      mockQueue.pause.mockResolvedValue();

      await service.pauseQueue();

      expect(mockQueue.pause).toHaveBeenCalled();
    });

    it('should resume the queue', async () => {
      mockQueue.resume.mockResolvedValue();

      await service.resumeQueue();

      expect(mockQueue.resume).toHaveBeenCalled();
    });

    it('should clear the queue', async () => {
      mockQueue.empty.mockResolvedValue();

      await service.clearQueue();

      expect(mockQueue.empty).toHaveBeenCalled();
    });
  });
});
