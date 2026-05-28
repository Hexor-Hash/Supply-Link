# Audit Policy

## Overview
This document outlines the audit logging policy for Supply-Link's backend operations. Privileged operations must produce structured, immutable audit logs to ensure compliance, accountability, and to aid in incident response.

## Privileged Operations
The following operations are classified as privileged and require audit logging:
- **Fee-bump Creation**: `fee-bump.create`
- **File Uploads**: `file.upload`
- **Partners/Internal Access**: Any operation performed via partner or internal API keys.

## Audit Event Schema
Audit events are emitted as structured JSON objects with the following fields:

| Field | Description |
|-------|-------------|
| `timestamp` | ISO 8601 timestamp of the event. |
| `correlationId` | Unique ID for the request (from `X-Correlation-Id` or generated). |
| `actor` | Information about the caller (`type`, `ip`, `userAgent`). |
| `operation` | Name of the operation performed. |
| `request` | Redacted request metadata (method, path, query, body). |
| `response` | Redacted response metadata (status, body). |
| `result` | Outcome of the operation (`success` or `failure`). |
| `metadata` | Additional context-specific information. |

## Data Redaction
To protect sensitive information and PII, the following redaction rules are applied:
- **Secrets & Keys**: Any field containing "secret", "key", "password", "token", "seed", "mnemonic", etc., is replaced with `[REDACTED]`.
- **Headers**: Sensitive headers like `Authorization` and `Cookie` are redacted.
- **PII**: Personal data is masked before being logged to storage.

## Retention and Access
- **Storage**: Audit logs are emitted to standard output and collected by [Log Aggregator Name].
- **Retention**: Audit logs are retained for a minimum of 365 days for compliance.
- **Access**: Access to audit logs is restricted to authorized security and compliance personnel.
- **Immutability**: Once emitted, audit logs must not be modified or deleted until the retention period expires.

## Verification
Emission and redaction behavior are verified via unit tests in `frontend/lib/api/__tests__/audit.test.ts`.
