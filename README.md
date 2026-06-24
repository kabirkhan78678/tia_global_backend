# Tiaglobal Backend

Professional Node.js backend structure using Express and MySQL.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Create the database in MySQL and run `database/schema.sql` before using the sample users API.

## Structure

```text
src/
  config/
    db.js
    env.js
  middlewares/
    errorHandler.js
    notFoundHandler.js
  modules/
    users/
      user.controller.js
      user.model.js
      user.routes.js
      user.service.js
  routes/
    index.js
  utils/
    apiError.js
```

## Module Pattern

Each module keeps its own files together:

- `*.routes.js`: API endpoints
- `*.controller.js`: request and response handling
- `*.service.js`: business logic
- `*.model.js`: MySQL queries
# tia_global_backend
