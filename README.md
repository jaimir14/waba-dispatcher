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

# WhatsApp Pricing Configuration
WHATSAPP_COST_PER_MESSAGE=0.08
WHATSAPP_CURRENCY=USD
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
- `GET /messages/stats/:phoneNumber` - Get statistics for a specific phone number

### Conversations
- `POST /conversations/start` - Start a conversation with template
- `POST /conversations/send-text` - Send text message to confirmed conversation
- `GET /conversations/get` - Get conversation status

### Webhooks
- `GET /webhook` - WhatsApp webhook verification
- `POST /webhook` - WhatsApp webhook notifications

## Phone Number Statistics

The phone number statistics endpoint provides detailed insights into message performance for specific phone numbers.

### Endpoint
```
GET /messages/stats/:phoneNumber
```

### Parameters
- **Path Parameters:**
  - `phoneNumber` (required): The phone number to get statistics for (e.g., +50688776655)

- **Query Parameters:**
  - `startDate` (optional): Start date for filtering in YYYY-MM-DD format
  - `endDate` (optional): End date for filtering in YYYY-MM-DD format

### Example Requests

```bash
# Get all-time stats for a phone number
GET /messages/stats/+50688776655

# Get stats for a specific date range
GET /messages/stats/+50688776655?startDate=2024-01-01&endDate=2024-01-31

# Get stats from a specific date onwards
GET /messages/stats/+50688776655?startDate=2024-01-01
```

### Response Format

```json
{
  "status": "success",
  "message": "Stats retrieved successfully for phone number +50688776655",
  "data": {
    "phoneNumber": "+50688776655",
    "totalMessages": 25,
    "successfulMessages": 23,
    "failedMessages": 2,
    "deliveredMessages": 18,
    "readMessages": 5,
    "lastMessageSent": "2024-01-20T15:45:00.000Z",
    "averageResponseTime": 3000,
    "totalCost": 0.997,
    "currency": "USD",
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "messageBreakdown": {
      "sent": 23,
      "delivered": 18,
      "read": 5,
      "failed": 2
    },
    "costBreakdown": {
      "sent": 0.917,
      "delivered": 0.718,
      "read": 0.199,
      "failed": 0.000
    }
  }
}
```

### Statistics Included

- **Message Counts:** Total, successful, failed, delivered, and read messages
- **Performance Metrics:** Average response time, last message sent
- **Cost Analysis:** Total cost and breakdown by message status
- **Date Filtering:** Optional date range filtering for historical analysis
- **Status Breakdown:** Detailed breakdown of message delivery statuses

## Automatic Message Pricing

The system automatically sets default pricing for all new messages based on environment variables. This ensures consistent cost tracking across all messages.

### Default Pricing Structure

- **Cost Per Message**: `WHATSAPP_COST_PER_MESSAGE` (default: $0.08)
- **Currency**: `WHATSAPP_CURRENCY` (default: USD)

### How It Works

1. **Message Creation**: When a message is created, the system automatically sets default pricing
2. **Environment Variables**: Pricing is configured via environment variables for easy management
3. **Override Capability**: Existing pricing data is preserved if provided during creation
4. **Cost Tracking**: All messages have consistent pricing structure for accurate cost analysis
5. **Simple Calculation**: Total cost = Cost per message × Number of messages sent

### Pricing Data Structure

```json
{
  "cost": 0.08,
  "currency": "USD",
  "created_at": "2024-01-15T10:30:00.000Z",
  "source": "environment_default"
}
```

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
