Read AGENTS.md, ROADMAPv2.md, CLAUDE.md, docs/plans/README.md, docs/plans/ROADMAPV2-MASTER-PLAN.md, docs/plans/PHASE-0-FOUNDATION-HARDENING.md, and docs/plans/PHASE-0-TEST-SPEC.md first.

Then start executing Phase 0 Tranche B for oiHubv2 without skipping roadmap gates.

Goals:
1. Harden WebSocket reconnection with bounded exponential backoff.
2. Add stale-data detection based on last successful update/message time.
3. Surface fresh / stale / disconnected state in the UI.
4. Keep the current product as a read-only analysis platform.
5. Do not add order placement, trading keys, or fake data fallback.

Constraints:
- Follow AGENTS.md as the primary repo contract.
- Keep diffs small, reviewable, and scoped.
- If you touch trading or domain logic, add/update tests.
- Never import from archived/.
- Use UTC ms internally for timestamps.
- Do not skip verification.

Required verification:
- npm run lint
- npm run type-check
- npm test -- --run
- npm run build
- npm run test:e2e (if UI behavior changes)

Final output must include:
1. Summary of what changed
2. Changed files
3. Verification results
4. Remaining risks
