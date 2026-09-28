Act as an Expert Senior Full-Stack Developer and SaaS Architect. 

I want you to build the Web Dashboard and REST API backend for a Multi-Tenant SaaS application called "E-Presensi Guru Madrasah Ibtidaiyah" (Teacher E-Attendance System). 

### 1. TECH STACK & LIBRARIES
- Framework: Next.js (App Router, latest) with TypeScript.
- Styling: Tailwind CSS & Sdnui.
- UI Components: Shadcn UI (Theme: Professional Ministry/Kemenag aesthetic using Green, White, and Gold accents).
- Database & ORM: PostgreSQL (via Supabase) + Prisma ORM.
- State Management & Fetching: React Query (TanStack Query) + Axios.
- Datatables: TanStack Table v8 (Server-Side Pagination, Sorting, Filtering).
- Authentication: NextAuth.js (Auth.js) for Web RBAC, and JWT validation for the Mobile API.
- Forms & Validation: React Hook Form + Zod.
- UI Theme: Professional Ministry/Kemenag aesthetic using Green, White, and Gold accents
- folder project : web


### 2. ROLES & MULTI-TENANCY (STRICT DATA ISOLATION)
1. SUPERADMIN: Manages all registered Madrasahs, toggles active/inactive status, and views global analytics.
2. ADMIN MADRASAH: Operator for a specific institution. Manages their own teachers, configures Geofencing coordinates (Lat/Lng/Radius), and views/exports attendance reports. Data is STRICTLY isolated by `madrasahId`.


### 3. ARCHITECTURE & FOLDER STRUCTURE (STRICT RULES)
You must combine Atomic Design for UI and Feature-Sliced Design for business logic. Do not mix patterns.
/src
  /app                        # Next.js App Router
    /api                      # REST API Endpoints for the Flutter mobile app
    /(web)                    # Web UI Routes (Login, Dashboards)
  /components                 # Pure UI Components (Atomic Design)
    /atoms                    # Buttons, Inputs, Badges
    /molecules                # Form Fields, Search Bars
    /organisms                # DataTables, Sidebar, Navbar, Geofence Maps
    /templates                # Page Layouts
  /features                   # Domain-Driven Modules
    /attendance               # Attendance logic, API services, Zod schemas, Types
    /madrasah                 # Madrasah management logic
    /users                    # Teacher/Admin management logic
  /lib                        # Core Configurations (Prisma client, Auth, Haversine util)
  /server                     # Server Actions and Prisma DB Queries (Repository Pattern)


### 4. CORE WEB FEATURES TO BUILD
- Auth System: Login page redirecting to role-specific dashboards.
- Superadmin Dashboard: CRUD for Madrasah entities.
- Admin Madrasah Dashboard: 
  - CRUD for Teachers (Guru).
  - Geofence Settings Form (Input for Latitude, Longitude, and Radius in meters).
  - Attendance Report DataTable (Server-side rendering, exportable).
- REST API for Mobile: The `/app/api/attendance/clock-in` endpoint must receive Lat/Lng/Photo, validate the distance using the Haversine formula against the Madrasah's Geofence settings, and insert the `AttendanceLog`.


### 5. INITIALIZATION TASK (PHASE 1)
Due to token limits, DO NOT generate the entire application at once. We will build this in phases.
For your first response, ONLY provide:
1. The exact CLI setup commands (Next.js, Shadcn, Prisma, etc).
2. The complete `schema.prisma` accommodating the Multi-Tenant architecture (Roles, Madrasah, MadrasahSetting, User, AttendanceLog).
3. The exact folder tree representation based on the architecture rules above.
4. The `src/lib/utils.ts` file containing the Haversine formula for Geofence distance calculation.

Acknowledge these rules and wait for my command (e.g., "Build the Auth Module" or "Build the Geofence API") for the next phase.