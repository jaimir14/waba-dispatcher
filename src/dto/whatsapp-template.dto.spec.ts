import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  WhatsAppTemplateMessageDto,
  TemplateDto,
  TextParameter,
  CreateTemplateMessageDto,
  ParameterType,
} from './whatsapp-template.dto';

describe('WhatsApp Template DTOs', () => {
  describe('TextParameter', () => {
    it('should validate with valid text', async () => {
      const param = plainToClass(TextParameter, {
        text: 'Hello World',
      });

      const errors = await validate(param);
      expect(errors).toHaveLength(0);
      expect(param.type).toBe(ParameterType.TEXT);
    });

    it('should fail with empty text', async () => {
      const param = plainToClass(TextParameter, {
        text: '',
      });

      const errors = await validate(param);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });
  });

  describe('TemplateDto', () => {
    it('should validate with required fields', async () => {
      const template = new TemplateDto('welcome_message');

      const errors = await validate(template);
      expect(errors).toHaveLength(0);
      expect(template.language.code).toBe('es');
      expect(template.language.policy).toBe('deterministic');
    });

    it('should validate with optional components', async () => {
      const template = new TemplateDto('welcome_message');
      template.components = [
        plainToClass(TextParameter, {
          type: ParameterType.TEXT,
          text: 'Hello {{1}}!',
        }),
      ];

      const errors = await validate(template);
      expect(errors).toHaveLength(0);
    });

    it('should set Spanish language by default', () => {
      const template = new TemplateDto('welcome_message');
      expect(template.language.code).toBe('es');
      expect(template.language.policy).toBe('deterministic');
    });

    it('should allow custom policy', () => {
      const template = new TemplateDto('welcome_message', 'fallback');
      expect(template.language.code).toBe('es');
      expect(template.language.policy).toBe('fallback');
    });
  });

  describe('WhatsAppTemplateMessageDto', () => {
    it('should validate with required fields', async () => {
      const message = plainToClass(WhatsAppTemplateMessageDto, {
        to: '1234567890',
        template: new TemplateDto('welcome_message'),
      });

      const errors = await validate(message);
      expect(errors).toHaveLength(0);
      expect(message.messaging_product).toBe('whatsapp');
      expect(message.type).toBe('template');
    });

    it('should validate with components', async () => {
      const message = plainToClass(WhatsAppTemplateMessageDto, {
        to: '1234567890',
        template: new TemplateDto('welcome_message'),
      });
      message.template.components = [
        plainToClass(TextParameter, {
          type: ParameterType.TEXT,
          text: 'Hello {{1}}!',
        }),
      ];

      const errors = await validate(message);
      expect(errors).toHaveLength(0);
    });
  });

  describe('CreateTemplateMessageDto', () => {
    it('should validate with required fields', async () => {
      const dto = plainToClass(CreateTemplateMessageDto, {
        to: '1234567890',
        template_name: 'welcome_message',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with optional parameters', async () => {
      const dto = plainToClass(CreateTemplateMessageDto, {
        to: '1234567890',
        template_name: 'welcome_message',
        parameters: [
          plainToClass(TextParameter, {
            type: ParameterType.TEXT,
            text: 'John',
          }),
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid phone number', async () => {
      const dto = plainToClass(CreateTemplateMessageDto, {
        to: '', // Invalid: empty
        template_name: 'welcome_message',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });

    it('should fail with invalid template name', async () => {
      const dto = plainToClass(CreateTemplateMessageDto, {
        to: '1234567890',
        template_name: '', // Invalid: empty
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });
  });

  describe('Enum values', () => {
    it('should have correct parameter type values', () => {
      expect(ParameterType.TEXT).toBe('text');
    });
  });
});
