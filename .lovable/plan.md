

# Marketing Operations Platform (War Room) — Phase 1: Core Build

## Theme & Design
- **Garena-style dark theme**: Black background (`#0A0A0A`), primary red (`#FF0000`), dark red accents, high-contrast white text
- Aggressive but clean aesthetic with sharp corners, bold typography, and subtle red glows/borders
- Fully responsive sidebar layout

## 1. Authentication & User Management
- **Email/Password login page** with Garena-styled dark form
- **Role-based access**: 4 roles stored in a separate `user_roles` table (manager, leader, sales, graphic)
- **Admin User Management page** (manager role only):
  - Create, edit, delete users
  - Assign roles and teams
  - View all users in a searchable table
- **Profile settings** accessible from the top bar (avatar, username, password change)

## 2. Database Schema (Supabase)
- `profiles` — user info (username, avatar, email, team_id)
- `user_roles` — separate roles table (manager, leader, sales, graphic)
- `teams` — team name + leader reference
- `daily_stats` — daily performance data per user (signups, deposits, ad spend, website, content link)
- RLS policies ensuring sales users can only insert/view their own team's data; managers see everything

## 3. Dashboard (Main Page)
- **Global Filters** at the top:
  - Date picker (defaults to yesterday)
  - Team dropdown
  - Sales name dropdown
- **KPI Cards Row** — 11 metric cards calculated from filtered `daily_stats`:
  - Total Signups, Total Depositors, % Conversion
  - First Deposit, Total Deposit, Ad Spend
  - Cost Per Head (rounded integer)
  - Monthly Signups, Monthly Depositors, % Monthly Conversion
  - Total Expenses (mocked for now)
- **Dual Y-Axis Line Chart** (Recharts):
  - Left Y-axis: Signups over time
  - Right Y-axis: Total Deposit over time
  - X-axis: Date
- **Top Sales Leaderboard Table**:
  - Ranked by signups
  - Columns: Name, Signups, Cost Per Head, % Conversion
  - Heatmap-style green background on conversion column
- **Realtime updates** via Supabase Realtime — dashboard refreshes live when new data is entered

## 4. Daily Input Page
- **Input Form** for `daily_stats`:
  - Fields: Date, User (auto-filled for sales role), Signups, Deposits, First Deposit (THB), Total Deposit (THB), Ad Spend (USD), Website (MGB-USA / UNI-USA / MGB-X dropdown), Content Link
  - Validation: all fields required, red border on empty fields
  - Sales users can only submit for themselves
- **History Table** below the form:
  - Shows past entries filtered by logged-in user's team
  - Sortable columns, date-filtered

## 5. Sidebar Navigation
- Dashboard
- Daily Input
- User Management (visible to managers only)
- Profile/Settings
- Placeholder items for future features (Assignments, Graphic Briefs, Resources) — disabled/grayed out

## Future Phases (Not Built Now)
- Assignments & submission tracking (you'll share specific flows)
- Graphic Briefs workflow (queue → cutting → done → fix)
- Resources library

