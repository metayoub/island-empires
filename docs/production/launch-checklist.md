# Launch Checklist

- [ ] Production environment variables match `.env.example` and secret manager values.
- [ ] `AUTH_COOKIE_SECURE=true`, `AUTH_DEV_MODE=false`, and strict CORS are set.
- [ ] Staging deployment passed smoke tests and final QA.
- [ ] Production database migrations were reviewed.
- [ ] Backups are scheduled, encrypted, monitored, and restore-tested.
- [ ] `/api/health`, `/api/health/deep`, and `/api/health/metrics` are monitored.
- [ ] Error tracking DSN is configured for API, worker, web, and admin.
- [ ] Payment webhook secret and provider keys are production values.
- [ ] CDN cache rules are active for static assets.
- [ ] Support, privacy policy, and terms pages are reachable.
- [ ] Load test meets launch target for health and core authenticated flows.
- [ ] Security check and dependency audit are complete.
- [ ] Rollback owner and previous release image tags are known.
- [ ] Incident response roles and support contact are staffed for launch window.
- [ ] Player-facing launch and maintenance communication templates are ready.
