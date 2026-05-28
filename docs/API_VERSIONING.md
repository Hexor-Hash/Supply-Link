# API Versioning Policy

> closes #307

## Version Strategy

All Supply-Link API routes follow a **URL path versioning** scheme:

```
/api/v{N}/...
```

- Current stable version: **v1**
- Unversioned routes (`/api/ratings`, `/api/health`) are treated as **v0** and will be migrated to `/api/v1/` in a future release.

## Additive vs Breaking Changes

| Change type                  | Classification  | Action required              |
| ---------------------------- | --------------- | ---------------------------- |
| Add optional request field   | Additive ✅     | None                         |
| Add optional response field  | Additive ✅     | None                         |
| Add new endpoint             | Additive ✅     | None                         |
| Remove request field         | **Breaking** ❌ | Bump version                 |
| Remove response field        | **Breaking** ❌ | Bump version                 |
| Change field type            | **Breaking** ❌ | Bump version                 |
| Change HTTP status code      | **Breaking** ❌ | Bump version                 |
| Change error code enum value | **Breaking** ❌ | Bump version                 |
| Rename endpoint path         | **Breaking** ❌ | Bump version + deprecate old |

## Deprecation Lifecycle

1. **Announce** — Add `Deprecation` and `Sunset` headers to the endpoint.
2. **Minimum notice** — 90 days before removal.
3. **Remove** — After the Sunset date, return `410 Gone`.

### Deprecation Headers

```
Deprecation: true
Sunset: Sat, 01 Aug 2026 00:00:00 GMT
Link: </api/v2/endpoint>; rel="successor-version"
```

Use the `withDeprecation()` helper in `lib/api/versioning.ts`.

## Supported Versions

| Version          | Status        | Sunset date |
| ---------------- | ------------- | ----------- |
| v1               | ✅ Stable     | —           |
| v0 (unversioned) | ⚠️ Deprecated | 2026-08-01  |

## Schema Snapshots

Response shape snapshots for critical endpoints live in:

```
frontend/__tests__/snapshots/
```

Run the compatibility suite locally with `npx vitest run __tests__/apiCompat.test.ts --reporter=verbose` and update snapshots intentionally when the contract changes.

## CI Enforcement

Keep the compatibility snapshots current whenever the contract changes. If a snapshot diverges, rerun the compatibility suite locally, review the delta, and only update the snapshot when the API change is intentional.
