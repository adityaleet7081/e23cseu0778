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