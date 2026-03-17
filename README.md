# Nest Next Scaffold App

This is a comprehensive monorepo application featuring a **Next.js** client and a **NestJS** server. It is designed as a **robust scaffold for future projects**, establishing sane defaults and best practices for scalable application development.

Comprehensive architecture and design details can be found at [DeepWiki](https://deepwiki.com/nigelnindodev/nest-next-with-auth-scaffold)

Key features include:
*   **Microservices Architecture**: Ready-to-use microservice setup (e.g., Redis).
*   **Authentication**: A complete database structure and logic for authentication built from the ground up.
*   **Containerization**: Full Docker & Docker Compose setup.

The frontend contains a working example of Sign In via Google (OAuth 2), with an app that allows for updating of a users bio:

<img width="1364" height="655" alt="Screenshot from 2026-02-23 11-05-17" src="https://github.com/user-attachments/assets/2e445c3b-ee4f-41e1-8640-e2e30e6ca5ca" />

<img width="1364" height="655" alt="Screenshot from 2026-02-23 11-03-38" src="https://github.com/user-attachments/assets/222ce98b-97f2-450f-bb11-871e8736a0ba" />

<img width="1364" height="691" alt="Screenshot from 2026-02-23 11-35-24" src="https://github.com/user-attachments/assets/d797d5f0-f58a-41cc-af41-662ec79f4759" />

## Project Structure

The repository is organized into a client-server architecture:

*   **`client/`**: The frontend application built with Next.js 16.
*   **`server/`**: The backend API built with NestJS 11.

## Technology Stack

### Client
*   **Framework**: Next.js 16 (App Router)
*   **Library**: React 19
*   **Styling**: Tailwind CSS v4, Lucide React
*   **State Management/Fetching**: TanStack Query v5
*   **Utilities**: `clsx`, `tailwind-merge`

### Server
*   **Framework**: NestJS 11
*   **Database**: PostgreSQL (via TypeORM)
*   **Caching/Queue**: Redis
*   **Logging**: Pino (structured logging)
*   **Validation**: `class-validator`, `zod`
*   **Documentation**: Swagger/OpenAPI

## Getting Started

You can run the project using **Docker Compose** (recommended for ease of use) or manually via **NPM scripts**.

### Prerequisites

*   Docker & Docker Compose (for containerized setup)
*   Node.js (v20+) & NPM (for manual setup)

### Option 1: Docker Compose Setup

This is the simplest way to get the entire stack (Database, Redis, API, and Frontend) running.

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd xborg
    ```

2.  **Start the services:**
    ```bash
    docker-compose up --build
    ```

    This command will:
    *   Start a PostgreSQL container.
    *   Start a Redis container.
    *   Build and start the NestJS Server (mapped to port 5000).
    *   Build and start the Next.js Client (mapped to port 3000).

3.  **Access the application:**
    *   **Frontend**: [http://localhost:3000](http://localhost:3000)
    *   **Backend API**: [http://localhost:5000](http://localhost:5000)
    *   **API Documentation**: [http://localhost:5000/api](http://localhost:5000/api) (Swagger)

### Option 2: Manual Setup

If you prefer to run services locally or need to debug specific parts without Docker.

1.  **Install Dependencies:**
    Run the setup script from the root directory to install dependencies for both client and server.
    ```bash
    npm run setup
    ```

2.  **Environment Configuration:**
    Ensure you have a PostgreSQL database and a Redis instance running locally.
    
    *   **Server**: Create `server/.env` based on `server/.env.example` (or `server/.env.local`).
    *   **Client**: Create `client/.env.local` if necessary (though strictly not required for development default).

3.  **Start the Server:**
    In a terminal:
    ```bash
    npm run server:start
    # OR for development watch mode (go to server dir)
    cd server && npm run start:dev
    ```

4.  **Start the Client:**
    In a separate terminal:
    ```bash
    npm run client:start
    # OR for development
    cd client && npm run dev
    ```

## Development

The root `package.json` includes helpful scripts to manage the monorepo:

*   `npm run lint:client`: Lint the client code.
*   `npm run lint:server`: Lint the server code.
*   `npm run build:client`: Build the client for production.
*   `npm run build:server`: Build the server for production.

## Git Hooks

This project utilizes **Husky** and **Lint-Staged** to ensure code quality:
*   **Pre-commit**: Runs linting on staged files to prevent bad code from being committed.

## Architecture Documentation

Comprehensive code documentation can be found at [DeepWiki](https://deepwiki.com/nigelnindodev/nest-next-with-auth-scaffold)

For more detailed information about the inner workings of each application, refer to their specific documentation:

*   [Client Documentation](./client/README.md)
*   [Server Documentation](./server/README.md)
