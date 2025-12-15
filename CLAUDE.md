# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Syncable** is a modern time tracking and electronic timesheet management platform built with Next.js. The application enables users to track work hours, manage breaks, generate reports, and export time data. The application is designed for the Brazilian market with timezone support for America/Sao_Paulo and Portuguese localization.

## Development Commands

### Running the Application

**Development mode:**
```bash
yarn dev
```

**Production build:**
```bash
yarn build
yarn start
```

**Linting:**
```bash
yarn lint
```

### Docker Development

The project includes Docker Compose configuration for local development with PostgreSQL.

**Start all services:**
```bash
docker-compose up
```

**Initialize database schema:**
```bash
docker exec -i db psql -U postgres -d postgres < init-db.sql
```

**Access database directly:**
```bash
docker exec -i db psql -U postgres -d postgres
```

The database is accessible at `localhost:5432` with credentials:
- User: `postgres`
- Password: `default`
- Database: `postgres`

### Database Schema Generation

The project includes SchemaSpy for database documentation:
```bash
docker-compose --profile schemaspy up schemaspy
```

## Architecture

### Database Layer

The application uses **dual database drivers** based on environment:
- **Development:** PostgreSQL via `pg` library for local Docker development
- **Production:** Neon Serverless for production deployments

**Database connection** (`lib/db.ts`):
- Automatically detects environment and uses appropriate driver
- Sets timezone to `America/Sao_Paulo` on every connection
- Supports tagged template literals for parameterized queries
- Checks multiple environment variables: `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL`

**Database Schema:**
- `users` - User accounts with email/password authentication
- `user_settings` - Per-user configuration (working hours, timezone, notifications, sharing preferences, theme)
- `time_entries` - Clock in/out records with status tracking
- `breaks` - Break periods associated with time entries

### Authentication

**Cookie-based session management** (`app/actions/auth.ts`):
- Uses SHA-256 password hashing (not bcrypt)
- Stores `session_id` and `user_id` in HTTP-only cookies
- 7-day session expiration
- Helper functions: `getCurrentUser()`, `requireAuth()`

**Important:** Authentication is cookie-based, not JWT. Always use `requireAuth()` or `getCurrentUser()` to verify authentication state.

### Server Actions Pattern

All data operations use Next.js Server Actions with `"use server"` directive:
- `app/actions/auth.ts` - Authentication operations
- `app/actions/time-entries.ts` - Time tracking operations (start, end, pause/resume)
- `app/actions/reports.ts` - Report generation and sharing
- `app/actions/dashboard-summary.ts` - Dashboard statistics
- `app/actions/user-settings.ts` - User preferences management
- `app/actions/user-profile.ts` - User profile operations
- `app/actions/manual-entries.ts` - Manual time entry management

**Conventions:**
- Return format: `{ success: boolean, data?: T, error?: string }`
- Always call `revalidatePath()` after mutations to refresh UI
- All timestamps use database NOW() function to ensure timezone consistency

### Routing Structure

Standard Next.js App Router:
- `/` - Landing page
- `/login` - Login page
- `/register` - Registration page
- `/dashboard` - Main dashboard (requires auth)
- `/reports` - Time reports and export (requires auth)
- `/settings` - User settings (requires auth)
- `/shared-report/[token]` - Public report sharing (no auth)

### UI Components

**Component organization:**
- `components/ui/` - shadcn/ui primitives (accordion, button, card, dialog, etc.)
- `components/` - Application-specific components
- `components/settings/` - Settings page components

**Key application components:**
- `time-tracker.tsx` - Clock in/out controls
- `recent-entries.tsx` - Recent time entries list
- `report-table.tsx` - Report data table
- `dashboard-shell.tsx` - Main dashboard layout
- `main-nav.tsx` - Primary navigation
- `user-nav.tsx` - User menu dropdown

**Styling:**
- Tailwind CSS with custom configuration
- Theme support via `next-themes` (dark/light mode)
- Utility function `cn()` for conditional class merging

### Time Handling

**Timezone support:**
- User timezones are stored in `user_settings.timezone` field
- Timezone context is provided via `TimezoneProvider` in the root layout
- All components use `useTimezone()` hook to access the user's preferred timezone
- Default timezone is `America/Sao_Paulo` (Brazilian time)
- Supported timezones include major cities across Americas, Europe, Asia, and Oceania

**Timezone utility functions** (`lib/timezone.ts`):
- All functions accept an optional `timezone` parameter (defaults to `America/Sao_Paulo`)
- `formatDateBR(date, timezone)` - Format date in DD/MM/YYYY format
- `formatTimeBR(date, timezone)` - Format time in 24-hour format
- `formatDateForInput(date, timezone)` - Format for HTML date input (YYYY-MM-DD)
- `formatTimeForInput(date, timezone)` - Format for HTML time input (HH:MM)
- `createDateInTimezone(dateStr, timeStr, timezone)` - Create Date from user input in their timezone
- `toTimezone(date, timezone)` - Convert date to specific timezone
- `getNowInTimezone(timezone)` - Get current date/time in timezone
- `isSameDayBR(date1, date2, timezone)` - Check if dates are on same day

**Duration formatting** (`lib/utils.ts`):
- `formatDuration(ms)` - Convert milliseconds to "Xh Ym" format
- `calculateDuration(startTime, endTime)` - Calculate duration between timestamps

**Time entry states:**
- `active` - Currently tracking time
- `completed` - Finished time entry
- `deleted` - Soft-deleted entry

**Important timezone handling rules:**
1. **Display**: Always use `useTimezone()` hook to get user's timezone and pass it to formatting functions
2. **Input**: When creating Date objects from user input (e.g., manual time entry), use `createDateInTimezone(dateStr, timeStr, timezone)` to interpret the input in the user's timezone
3. **Storage**: Dates are stored in the database as UTC timestamps, but timezone interpretation happens at the application layer
4. **Example flow**: User in London enters "09:00" → `createDateInTimezone("2025-12-15", "09:00", "Europe/London")` → Stored as UTC → Displayed as "09:00" when user's timezone is London

## Common Patterns

### Querying Data

Always use the `sql` tagged template from `lib/db.ts`:

```typescript
import { sql } from "@/lib/db"

// Parameterized queries
const users = await sql`
  SELECT * FROM users WHERE email = ${email}
`

// INSERT with RETURNING
const result = await sql`
  INSERT INTO time_entries (user_id, start_time, status)
  VALUES (${userId}, NOW(), 'active')
  RETURNING id, user_id, start_time, status
`
```

### Protected Routes

Pages requiring authentication should call `requireAuth()`:

```typescript
import { requireAuth } from "@/app/actions/auth"

export default async function ProtectedPage() {
  const user = await requireAuth() // Redirects to /login if not authenticated
  // ... page content
}
```

### Form Submissions

Use Server Actions with FormData:

```typescript
"use server"

export async function myAction(formData: FormData) {
  const value = formData.get("fieldName") as string
  // ... process data
  revalidatePath("/dashboard")
  return { success: true, data: result }
}
```

### Revalidation

Always revalidate after mutations:
```typescript
import { revalidatePath } from "next/cache"

// After database changes
revalidatePath("/dashboard")
revalidatePath("/reports")
```

## Known Issues and TODOs

See `todo.md` for current bug tracking and feature requests. Notable items:
- Shared report page not displaying data correctly
- Dashboard statistics charts not showing data
- Missing visual feedback (toasts) for settings operations
- Planned features: language toggle (PT/EN), overtime tracking, 12/24-hour format preference

## Technology Stack

- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS + shadcn/ui components
- **Database:** PostgreSQL (local) / Neon Serverless (production)
- **Forms:** react-hook-form + Zod validation
- **Theme:** next-themes (dark/light mode)
- **Charts:** Recharts
- **Date Handling:** date-fns
- **Notifications:** Sonner (toast notifications)
- **Package Manager:** Yarn

## Environment Variables

Required environment variables:
- `DATABASE_URL` or `POSTGRES_URL` - Database connection string
- `NODE_ENV` - Set to `development` for local Docker database

## Development Notes

- The application uses Brazilian Portuguese for UI text and localization
- All times must be handled with `America/Sao_Paulo` timezone awareness
- Password hashing uses SHA-256 (consider upgrading to bcrypt for production)
- Session management is cookie-based without a sessions table
- The project structure follows Next.js conventions strictly
