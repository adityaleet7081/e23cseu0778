# Stage 1

## Core Actions the Notification Platform Should Support
1. Send a notification to a student
2. Fetch all notifications for a student
3. Mark a notification as read
4. Delete a notification
5. Fetch unread notification count

## REST API Endpoints

### 1. Get All Notifications for a Student
**GET** `/api/notifications/:studentId`
**Headers:** `Authorization: Bearer <token>`
**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "studentId": "uuid",
      "type": "Placement | Event | Result",
      "message": "string",
      "isRead": false,
      "createdAt": "2026-04-22T17:51:30Z"
    }
  ]
}
```

### 2. Mark Notification as Read
**PATCH** `/api/notifications/:notificationId/read`
**Headers:** `Authorization: Bearer <token>`
**Response:**
```json
{ "message": "Notification marked as read" }
```

### 3. Get Unread Count
**GET** `/api/notifications/:studentId/unread-count`
**Response:**
```json
{ "unreadCount": 5 }
```

### 4. Delete a Notification
**DELETE** `/api/notifications/:notificationId`
**Response:**
```json
{ "message": "Notification deleted successfully" }
```

## Real-Time Notification Mechanism
Use **WebSockets** (Socket.io) for real-time delivery:
- When a new notification is created, emit a `new_notification` event to the student's socket room
- Each student connects with their studentId and joins a personal room
- Server emits to `room:studentId` on new notification

# Stage 2

## Recommended Database: PostgreSQL

### Why PostgreSQL?
- Relational data fits perfectly (students, notifications have clear relationships)
- Supports indexing for fast queries on large datasets
- ACID compliant — no data loss for critical notifications
- Supports enums natively for notification types

## Database Schema

```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE notification_type AS ENUM ('Placement', 'Event', 'Result');

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  message VARCHAR(255) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Problems as Data Volume Increases
1. Fetching all notifications per student becomes slow (full table scan)
2. Unread count queries get expensive
3. Write bottlenecks when sending bulk notifications

## Solutions
1. **Index** on `student_id` and `created_at` for fast lookups
2. **Pagination** — never fetch all notifications at once
3. **Read replicas** — separate read and write traffic

## SQL Queries

### Fetch all unread notifications for a student
```sql
SELECT * FROM notifications
WHERE student_id = 'uuid-here'
AND is_read = false
ORDER BY created_at DESC
LIMIT 20;
```

### Mark notification as read
```sql
UPDATE notifications
SET is_read = true
WHERE id = 'notification-uuid';
```

### Get unread count
```sql
SELECT COUNT(*) FROM notifications
WHERE student_id = 'uuid-here'
AND is_read = false;
```

# Stage 3

## Is the query accurate?
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```
Yes it is accurate but has performance issues at scale.

## Why is it slow?
- `SELECT *` fetches all columns including large fields unnecessarily
- No index on `studentID` or `isRead` — causes full table scan
- With 50,000 students and 5,000,000 notifications this is very expensive

## What would I change?
```sql
SELECT id, type, message, created_at FROM notifications
WHERE student_id = 1042 AND is_read = false
ORDER BY created_at DESC
LIMIT 20;
```
- Select only needed columns
- Add LIMIT for pagination
- Add indexes (see below)

## Computation Cost
- Without index: O(n) full table scan — very slow
- With index: O(log n) — fast even at 5M rows

## Should we add indexes on every column?
**No.** This is bad advice because:
- Indexes slow down INSERT and UPDATE operations
- They consume extra storage
- Only index columns used in WHERE, ORDER BY, JOIN clauses

## Correct indexes to add:
```sql
CREATE INDEX idx_notifications_student_id ON notifications(student_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

## Query to find students who got Placement notification in last 7 days
```sql
SELECT DISTINCT student_id FROM notifications
WHERE type = 'Placement'
AND created_at >= NOW() - INTERVAL '7 days';
```

# Stage 4

## Problem
Notifications are fetched on every page load for every student.
This is hammering the DB and causing slow user experience.

## Solution: Redis Caching

### How it works:
- First request → fetch from DB → store in Redis with TTL of 60 seconds
- Next requests within 60 seconds → serve from Redis (no DB hit)
- When new notification arrives → invalidate that student's cache

### Implementation Strategy:
GET /api/notifications/:studentId
  → Check Redis cache for key "notifications:studentId"
  → If cache HIT → return cached data
  → If cache MISS → query DB → store in Redis → return data

## Tradeoffs

| Strategy | Pros | Cons |
|---|---|---|
| Redis Cache | Very fast reads, reduces DB load | Stale data possible, extra infra |
| Pagination | Reduces data transfer | Doesn't reduce DB queries |
| DB Read Replica | Scales reads horizontally | Complex setup, replication lag |

## Recommended Approach
Combine Redis caching + Pagination:
- Cache per student with 60s TTL
- Paginate results 20 per page
- Invalidate cache on new notification or read status change


# Stage 5

## Problem with current implementation

Shortcomings:
1. Sequential loop — 50,000 students processed one by one = very slow
2. If send_email fails at student 200, remaining 49,800 get no email
3. No retry mechanism for failed emails
4. DB insert happens per student — 50,000 individual DB writes
5. Everything tightly coupled — one failure breaks everything

## What happened when send_email failed at 200 students?
Students 201 to 50,000 never got the email.
No way to know which students failed.
No retry was attempted.

## Redesigned Solution: Message Queue + Batch Processing

New pseudocode:

    function notify_all(student_ids, message):
        bulk_insert_to_db(student_ids, message)
        for student_id in student_ids:
            queue.push({ student_id, message })

    function worker():
        while queue is not empty:
            job = queue.pop()
            try:
                send_email(job.student_id, job.message)
                push_to_app(job.student_id, job.message)
            catch error:
                queue.retry(job, max_retries=3)

## Should DB save and email happen together?
No. They should be separate because:
- DB save should happen immediately and reliably
- Email delivery can be async and retried independently
- If coupled, a failed email would rollback the DB save too
- Students would never see notification in-app either