# HR Attendance & Payroll System

## Overview

This is an Arabic (RTL) HR Attendance and Departure management system that replicates Excel-based biometric attendance processing. The application processes raw biometric punch data, calculates attendance records with penalties/overtime, applies special business rules, and exports results to Excel files matching specific Arabic template formats.

Key capabilities:
- Import employee master data, biometric punches, missions, permissions, and leaves from Excel files
- Apply configurable special rules (custom shifts, attendance exemptions, penalty overrides, overnight overtime)
- Calculate daily attendance with late/early penalties and overtime
- Export detailed attendance reports and monthly summaries to Excel
- Full audit trail showing how each calculation was derived

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with RTL support and Arabic fonts (Cairo, IBM Plex Sans Arabic)
- **Charts**: Recharts for dashboard visualizations

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful endpoints defined in `shared/routes.ts` with Zod validation
- **File Processing**: Multer for Excel file uploads, xlsx library for parsing/generation

### Data Storage
- **Primary Storage**: In-memory storage class (`MemStorage`) for all runtime data
- **Schema Definition**: Drizzle ORM schemas in `shared/schema.ts` for type consistency
- **Persistence**: Data is session-based; refresh clears all data (by design for this offline-first tool)
- **Database Ready**: PostgreSQL configuration exists via Drizzle for potential future migration

### Business Logic
- **Rule Engine**: `server/ruleEngine.ts` implements special cases processing with priority-based rule evaluation
- **Attendance Calculation**: Server-side calculation triggered explicitly via API, not automatic
- **Audit Trail**: Every calculation produces traceable audit logs showing applied rules and data sources

### Key Design Decisions

1. **In-Memory Storage**: Chosen to meet the "offline/local" requirement. No persistent database, all data processed in session.

2. **Shared Schema Pattern**: Types defined once in `shared/schema.ts`, used by both frontend and backend ensuring type safety.

3. **Excel-First I/O**: All imports come from Excel, all exports generate Excel files matching Arabic template specifications.

4. **Rule Engine Before Calculation**: Special rules are evaluated before attendance calculations, allowing custom shifts, exemptions, and penalty overrides per employee/date.

5. **RTL-First UI**: CSS and component structure built for Arabic right-to-left layout from the start.

## External Dependencies

### Core Libraries
- **xlsx**: Excel file reading/writing for imports and exports
- **drizzle-orm** + **drizzle-zod**: Schema definitions and type generation (in-memory mode, not connected to DB)
- **zod**: Runtime validation for API requests and responses

### UI Framework
- **@radix-ui/\***: Accessible UI primitives (dialog, dropdown, tabs, etc.)
- **class-variance-authority**: Component variant styling
- **recharts**: Dashboard charts and visualizations
- **date-fns**: Date formatting with Arabic locale support

### Database (Configured but Optional)
- **PostgreSQL**: Connection configured via `DATABASE_URL` environment variable
- **connect-pg-simple**: Session storage (when database is provisioned)

### Build & Development
- **Vite**: Frontend bundling with HMR
- **esbuild**: Server-side TypeScript compilation
- **tsx**: TypeScript execution for development