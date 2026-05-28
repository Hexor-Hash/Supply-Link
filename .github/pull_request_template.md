## Summary

<!-- One paragraph describing what this PR does and why. -->

## Changes

<!-- Bullet list of the key changes. -->

-

## Testing

<!-- How was this tested? Check all that apply. -->

- [ ] `cargo test` passes locally
- [ ] New tests added for new behavior
- [ ] Existing tests updated to reflect changed behavior

## Smart contract doc-behavior checklist

<!-- Required for any PR that touches smart-contract/contracts/src/. -->
<!-- Skip with justification if the PR does not touch contract source. -->

- [ ] Every changed public function's `# Panics` section lists all current panic messages exactly as they appear in code
- [ ] Every changed public function's `# Emitted Events` section lists all emitted topics with correct slot count and types
- [ ] `# Parameters` docs match the current function signature (no removed/added params left undocumented)
- [ ] Immutable-field lists in `update_*` functions include all fields not modified by that function
- [ ] `# Warning` added if the function can silently overwrite existing state
- [ ] `EVENT_SCHEMA_VERSION` version table updated if `TrackingEvent` layout changed
- [ ] `docs/event-schema-versioning.md` version history updated if schema version was bumped

## General review checklist

- [ ] No secrets or credentials committed
- [ ] Breaking changes are documented
- [ ] `RUSTDOCFLAGS="-D warnings" cargo doc` passes (enforced by CI `doc` job)
