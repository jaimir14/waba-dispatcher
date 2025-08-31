# Database Relationship: Lists and Messages

## Overview

This document describes the database relationship between consolidated lists and WhatsApp messages in the waba-dispatcher service.

## Database Schema

### Lists Table
The `lists` table tracks consolidated list interactions:

```sql
CREATE TABLE lists (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL, -- References conversations table
  list_id VARCHAR(255) NOT NULL, -- Consolidated list ID from tiemposBE
  status ENUM('pending', 'accepted', 'rejected', 'expired'),
  accepted_at DATETIME,
  rejected_at DATETIME,
  expired_at DATETIME,
  metadata JSON,
  created_at DATETIME,
  updated_at DATETIME
);
```

### Messages Table
The `messages` table tracks individual WhatsApp messages:

```sql
CREATE TABLE messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_id UUID NOT NULL,
  whatsapp_message_id VARCHAR(255),
  to_phone_number VARCHAR(20) NOT NULL,
  list_id VARCHAR(255), -- NEW: Reference to consolidated list ID
  template_name VARCHAR(100),
  parameters JSON,
  status ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
  error_code VARCHAR(50),
  error_message TEXT,
  pricing JSON,
  sent_at DATETIME,
  delivered_at DATETIME,
  read_at DATETIME,
  created_at DATETIME,
  updated_at DATETIME
);
```

## Relationship

### One-to-Many: Consolidated List → Messages
- **One consolidated list** can have **multiple messages** sent to different phone numbers
- **Relationship field:** `list_id` in the `messages` table references `list_id` in the `lists` table
- **Example:** Consolidated list "2076" can have messages sent to phone numbers "50688776655", "50683186804", etc.

## Data Flow

### 1. List Message Creation
When a list message is sent via `POST /messages/send-list`:

1. **List record created** in `lists` table with:
   - `list_id`: Consolidated list ID (e.g., "2076")
   - `conversation_id`: Conversation UUID
   - `status`: "pending"

2. **Message records created** in `messages` table for each recipient with:
   - `list_id`: Same consolidated list ID (e.g., "2076")
   - `to_phone_number`: Recipient phone number
   - `status`: "pending"

### 2. Message Status Updates
As WhatsApp delivers messages:

1. **Message status updates** in `messages` table:
   - `pending` → `sent` → `delivered` → `read`
   - Or `pending` → `failed`

2. **List status updates** in `lists` table:
   - `pending` → `accepted` (when user responds)
   - `pending` → `rejected` (when user rejects)
   - `pending` → `expired` (after timeout)

## API Endpoints

### Get List Messages
```
GET /lists?list_id=2076
```

**Response:**
```json
{
  "id": "uuid-here",
  "conversation_id": "conversation-uuid",
  "list_id": "2076",
  "status": "pending",
  "messages": [
    {
      "id": 123,
      "conversation_id": "50688776655",
      "list_id": "2076",
      "status": "delivered",
      "accepted_at": "2025-08-30T05:13:08.000Z",
      "metadata": {
        "whatsapp_message_id": "wamid.xxx",
        "error_code": null,
        "error_message": null,
        "pricing": { "cost": 0.001, "currency": "USD" }
      },
      "created_at": "2025-08-30T05:13:08.000Z",
      "updated_at": "2025-08-30T05:13:08.000Z"
    }
  ]
}
```

## Migration History

### Migration: `20250830164733-add-list-id-to-messages.js`
- **Added:** `list_id` column to `messages` table
- **Added:** Indexes for performance optimization
- **Purpose:** Establish relationship between messages and consolidated lists

## Benefits

1. **Message Tracking:** Track which messages belong to which consolidated list
2. **Status Aggregation:** Get overall status of list delivery across all recipients
3. **Audit Trail:** Complete history of list message delivery
4. **Performance:** Optimized queries with proper indexing
5. **Integration:** Seamless integration with tiemposBE consolidated lists

## Usage Examples

### Find All Messages for a List
```typescript
const messages = await messageRepository.findByListId('2076');
```

### Get List with Related Messages
```typescript
const listWithMessages = await listsService.getLists({ list_id: '2076' });
```

### Check Delivery Status
```typescript
const deliveredMessages = messages.filter(msg => msg.status === 'delivered');
const failedMessages = messages.filter(msg => msg.status === 'failed');
```
