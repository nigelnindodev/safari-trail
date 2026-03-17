# Server Documentation

This is the backend API for the Nest Next Scaffold App, built with **NestJS 11**. It follows a modular architecture and provides a robust foundation for building scalable server-side applications.

## Technology Stack

*   **Framework**: [NestJS 11](https://nestjs.com/)
*   **Database**: PostgreSQL
*   **ORM**: [TypeORM](https://typeorm.io/)
*   **Caching/Queue**: Redis
*   **Logging**: [Pino](https://github.com/pinojs/pino) (via `nestjs-pino`)
*   **Validation**: `class-validator`, `zod`
*   **Documentation**: Swagger (OpenAPI)

## Project Structure

The project is structured into feature modules:

*   **`src/app.module.ts`**: The root module.
*   **`src/main.ts`**: Application entry point (bootstrapping, global pipes, swagger config).
*   **`src/auth/`**: Authentication logic (tokens, strategies, user verification).
*   **`src/users/`**: User management module.
*   **`src/security/`**: Security-related functionality.
*   **`src/config/`**: Configuration management (environment variables).
*   **`src/common/`**: Shared utilities and constants.
*   **`src/redis/`**: Redis client and microservice configuration.

## Architecture Overview

### Modular Design
NestJS encourages a modular architecture. Each feature (like `Auth`, `Users`) is encapsulated in its own module, keeping concerns separated and the codebase maintainable.

### Global Pipes and Validation
We use global validation pipes to ensure incoming data meets our expectations.
*   `ValidationPipe`: Automatically validates DTOs using `class-validator` decorators.
*   `transform: true`: Automatically transforms payloads to DTO instances.

### Logging
Structured logging is implemented using `nestjs-pino`, providing JSON logs in production for better observability and pretty-printed logs in development.

### Database & ORM
TypeORM is used for database interactions. Entities are defined as classes, and repositories are used to query the database.
*   Replaces direct SQL queries with type-safe operations.
*   Supports migrations (configured separately).

## Getting Started

### Prerequisites
*   Node.js (v20+)
*   PostgreSQL running locally or in Docker.
*   Redis running locally or in Docker.

### Installation
From the root of the monorepo:
```bash
npm run setup:server
```

### Environment Variables
Copy `.env.example` to `.env` and configure your database and Redis credentials.
```bash
cp .env.example .env
```
Ensure `POSTGRES_...` and `REDIS_...` variables match your local setup.

### Running the Server
```bash
# Development (watch mode)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

The server will start on port `5000` by default.
Swagger documentation is available at `http://localhost:5000/api`.

### Testing
```bash
# Unit tests
npm run test

# Integration/E2E tests
npm run test:e2e
```
