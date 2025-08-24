# WABA Dispatcher

A WhatsApp Business API microservice built with NestJS and TDD.

## Features

- WhatsApp Cloud API integration
- Multi-tenant support with company API keys
- Template message sending
- Conversation flow management
- Webhook processing
- Message status tracking
- Queue-based message processing

## Quick Start

### Prerequisites

- Node.js 18+
- MySQL database
- Redis (for queues)
- WhatsApp Business API credentials

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
# Application
NODE_ENV=development
PORT=3001
APP_NAME=waba-dispatcher

# Meta WhatsApp Business API
META_ACCESS_TOKEN=your_access_token
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_PHONE_NUMBER_ID=your_phone_number_id
META_VERIFY_TOKEN=your_verify_token

# Database
DB_HOST=your_db_host
DB_PORT=3306
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_NAME=waba_dispatcher

# Redis
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
```

### Database Setup

```bash
# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

### Running the Application

```bash
# Development
npm run start:dev

# Production
npm run start:prod
```

## API Endpoints

### Health Check
- `GET /health` - Application health status

### WhatsApp Connection Test
- `GET /test-whatsapp` - Test WhatsApp API connection

### Messages
- `POST /messages/send` - Send template messages to multiple recipients

### Conversations
- `POST /conversations/start` - Start a conversation with template
- `POST /conversations/send-text` - Send text message to confirmed conversation
- `GET /conversations/get` - Get conversation status

### Webhooks
- `GET /webhook` - WhatsApp webhook verification
- `POST /webhook` - WhatsApp webhook notifications

## Authentication

All endpoints require a company API key in the header:
```
X-API-Key: your_company_api_key
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## License

UNLICENSED
