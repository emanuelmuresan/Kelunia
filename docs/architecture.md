# Kelunia Architecture

Kelunia is organized so each upgrade can attach to a clear module instead of forcing changes across the whole app.

## Current Core

- `app/` keeps Next.js routes and page composition.
- `components/` keeps reusable UI pieces such as booking, fixed schedule, and access code modals.
- `lib/types/domain.ts` defines shared domain types for bookings, rooms, groups, locations, access codes, users, and audit entries.
- `lib/config/app.ts` keeps labels, defaults, empty form states, limits, and app-level constants.
- `lib/dates.ts` keeps date formatting and date range helpers.
- `lib/scheduling.ts` keeps booking normalization, conflict helpers, group highlighting, and fixed schedule ordering.
- `lib/queries/` keeps Firestore query builders.
  - `bookings.ts` owns calendar/list booking windows.
  - `location.ts` owns users, managers, and access-code reads scoped by location.
  - `resources.ts` owns rooms, groups, fixed schedules, and owner location reads with query limits.
- `lib/access-codes.ts` keeps access code generation, role normalization, and usage rules.
- `lib/locations.ts` keeps official location identity/document id logic.
- `lib/licensing.ts` keeps the Standard/Pro/Business plan model, trial/read-only state, feature flags, usage defaults, and plan limits.
- `lib/permissions/` keeps capability checks for bookings, settings, rooms, fixed schedules, codes, and audit access.
- `lib/usage-counters.ts` keeps lightweight location counters for scalable counts.
- `lib/notifications.ts` keeps notification labels and local notification keys.
- `lib/audit.ts` keeps audit logging.
- `lib/security.ts` keeps local security helpers.
- `features/*/hooks/` owns the live client reads for each app area, so `app/page.tsx` stays focused on page composition and user actions.
  - `features/locations/hooks/useLocations.ts` reads the visible locations.
  - `features/bookings/hooks/useBookings.ts` reads only the visible booking window.
  - `features/bookings/hooks/useBookingList.ts` owns list filtering and pagination.
  - `features/resources/hooks/useLocationResources.ts` reads rooms, groups, and fixed schedules.
  - `features/settings/hooks/useCalendarSettings.ts` reads configurable page labels.
  - `features/users/hooks/useManagedLocationUsers.ts` reads members and access codes for the selected location.
  - `features/locations/hooks/useLocationSetupAutocomplete.ts` owns Google Maps autocomplete for creating the first licensed location.

## Future Modules

When these features are added, they should get their own module before UI grows:

- `lib/permissions/` for role and capability checks.
- `lib/recurring/` for recurring booking expansion and exceptions.

Rule of thumb: UI components should call small domain functions or query functions; they should not contain Firestore rules, scheduling rules, licensing limits, or conflict logic directly.

## Release Roadmap

### v1.0 Standard

- One license per active location.
- 14 day trial, then read-only until the license is activated again.
- Calendar, bookings, rooms, groups, notifications, fixed/recurring schedules, basic audit history, PWA install on phone and desktop.
- Managers and members work only inside their location. The owner can see all locations.

### v2.0 Pro

- Multi-location management improvements.
- More granular role and room access controls.
- Stronger audit and export tools.

### v3.0 Business

- Multi-location dashboard.
- Organization-level administration.
- Billing automation.
- API/integrations.

## Data Safety

- Important deletes should be soft deletes first: `deleted`, `deletedAt`, `deletedBy`, and `deletedByUid`.
- Audit logs keep the before/after record of important changes.
- Firestore data should stay structural. File/document storage should only be added with dedicated Storage rules, backup/restore, and retention policy.

## Cost Rules

- Read by `locationId` first.
- Read bookings by visible date window.
- Prefer counters on `locations.usage` over loading whole collections just to count.
- Keep realtime listeners for small active surfaces only.
- Add pagination before a list can grow beyond the current query limit.
