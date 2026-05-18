Kelunia Firestore Structure

Current safe state

- `locations` stays global because the owner needs a central list of licensed locations.
- `users` stays global because Firebase Auth user ids are global.
- `licenses` stays global because the owner generates license codes before a location exists.
- Existing operational collections are still top-level for compatibility, but every query must be scoped by `locationId` and limited by date or count.

Target scalable state

Use the location document as the boundary for operational data:

```text
locations/{locationId}
  settings/calendar
  events/{eventId}
  rooms/{roomId}
  groups/{groupId}
  fixedSchedules/{scheduleId}
  floorplans/{floorplanId}
    items/{itemId}
  accessCodes/{codeId}
  auditLogs/{logId}
```

Global lookup collections can remain small and direct:

```text
users/{uid}
licenses/{licenseCode}
accessCodeLookup/{code}
```

Why this is better

- A location sees only its own operational data.
- Security rules become simpler because the path already contains `locationId`.
- Owner dashboards can still query all locations when needed.
- Firestore performance remains predictable because the app reads one location and one visible date window at a time.
- The Firebase console becomes easier to understand because rooms, groups, bookings and codes live under their location.

Migration rule

Do not move everything in one unsafe step. Use a controlled migration:

1. Add new subcollection write helpers.
2. Write new records to the new path.
3. Read from the new path, with a temporary fallback to the old top-level collection.
4. Run a one-time migration for existing records.
5. Remove old fallback reads after the data is verified.
6. Tighten Firestore rules around the new location-scoped paths.

Important

Firestore can handle large top-level collections if queries are indexed, filtered and limited. The reason to move to subcollections is not only speed; it is cleaner ownership, easier rules, safer maintenance and better long-term organization.

Floorplans

The current Pro floorplan module still uses top-level `floorplans` and `floorplanItems` collections for compatibility, with every query filtered by `locationId` and `floorplanId`. Storage files are already location-scoped:

```text
locations/{locationId}/floorplans/{floorplanId}/...
```

When the location-scoped Firestore migration starts, move floorplan documents together with the rest of the operational data so plans, items, documents and audit logs all stay under the same location boundary.
