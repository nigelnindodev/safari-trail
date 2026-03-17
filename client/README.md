# Client Documentation

This is the frontend application for the Nest Next Scaffold App, built with **Next.js 16** and **React 19**. It leverages the latest features like the App Router, Server Actions (where applicable), and React Server Components.

## Technology Stack

*   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
*   **Library**: [React 19](https://react.dev/)
*   **Styling**:
    *   [Tailwind CSS v4](https://tailwindcss.com/)
    *   [clsx](https://github.com/lukeed/clsx) & [tailwind-merge](https://github.com/dcastil/tailwind-merge) for dynamic classes
    *   [Lucide React](https://lucide.dev/) for icons
*   **Data Fetching**: [TanStack Query v5](https://tanstack.com/query/latest)
*   **State Management**: React Context (minimal global state) & Query Cache
*   **Authentication**: Custom integration with backend (cookie-based)

## Project Structure

The project follows a standard Next.js App Router structure:

*   **`src/app/`**: Application routes and pages.
    *   `layout.tsx`: Root layout configuration (fonts, providers).
    *   `page.tsx`: Home page.
    *   `globals.css`: Global styles and Tailwind directives.
*   **`src/components/`**: Reusable UI components.
    *   `ui/`: Generic UI components (likely shadcn/ui inspired).
*   **`src/lib/`**: Utility functions and API clients.
    *   `api-client.ts`: Main API interface for communicating with the backend.
    *   `utils.ts`: Helper functions (e.g., class merging).
*   **`src/hooks/`**: Custom React hooks.
*   **`src/providers/`**: Context providers (e.g., `QueryProvider`).
*   **`src/types/`**: TypeScript type definitions.

# Architecture Overview

### Data Fetching
We use **TanStack Query** for data fetching, caching, and synchronization. This allows us to:
*   Cache server responses efficiently.
*   Handle loading and error states automatically.
*   Invalidate queries to refresh data after mutations.

The `api-client.ts` file in `src/lib/` centralizes all API calls, ensuring a consistent interface and error handling strategy.

### Styling
Styling is handled via **Tailwind CSS**. We use utility classes for rapid development.
*   **Dark Mode**: Supported via Tailwind's `dark:` modifier and CSS variables.
*   **Responsiveness**: Mobile-first design principles.

## Getting Started

### Prerequisites
*   Node.js (v20+)
*   NPM

### Installation
From the root of the monorepo:
```bash
npm run setup:client
```

### Running the Development Server
```bash
npm run dev
# OR from root
npm run client:start
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building for Production
```bash
npm run build
```

### Linting
```bash
npm run lint
```
