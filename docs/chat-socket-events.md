# Chat Socket Events

Connect with the same login JWT used by the REST API.

```js
const socket = io(API_URL, {
  auth: {
    token: "Bearer <jwt-token>",
  },
});
```

All request events support an acknowledgement callback:

```js
socket.emit("chat:list", { page: 1, limit: 30 }, (response) => {
  if (!response.success) return console.log(response.error.message);
  console.log(response.data);
});
```

## Client To Server

### `chat:contacts`

Returns allowed chat contacts.

- Parent/student receive `teachers`.
- Teacher receives `parents` and `students`.

```js
socket.emit("chat:contacts", {}, ack);
```

### `chat:list`

Returns the authenticated user's conversations.

```js
socket.emit("chat:list", { page: 1, limit: 30 }, ack);
```

### `chat:conversation:create`

Creates or returns an existing conversation.

Allowed combinations:

- parent to teacher
- teacher to parent
- student to teacher
- teacher to student

```js
socket.emit(
  "chat:conversation:create",
  { recipientRole: "teacher", recipientId: 12 },
  ack
);
```

### `chat:join`

Joins a conversation room after access is verified.

```js
socket.emit("chat:join", { conversationId: 5 }, ack);
```

### `chat:messages`

Returns messages in ascending order. Use `beforeMessageId` for older pages.

```js
socket.emit(
  "chat:messages",
  { conversationId: 5, beforeMessageId: 100, limit: 30 },
  ack
);
```

### `chat:message:send`

Sends a message to an existing conversation or creates one from recipient data.

```js
socket.emit(
  "chat:message:send",
  { conversationId: 5, body: "Assalamu alaikum" },
  ack
);

socket.emit(
  "chat:message:send",
  { recipientRole: "teacher", recipientId: 12, body: "Assalamu alaikum" },
  ack
);
```

### `chat:read`

Marks a conversation read up to `messageId`. If `messageId` is omitted, latest message is used.

```js
socket.emit("chat:read", { conversationId: 5, messageId: 110 }, ack);
```

## Server To Client

### `chat:message:new`

Emitted to the conversation room when a new message is created.

### `chat:list:update`

Emitted to participant private rooms when the conversation list should be refreshed.

### `chat:read:update`

Emitted to the conversation room when a participant marks messages as read.

### `chat:error`

Emitted when an event fails and no acknowledgement callback was provided.
