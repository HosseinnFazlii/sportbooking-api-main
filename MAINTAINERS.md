# Maintainers — SportBooking API

**Ownership**
- Product Owner: [Mehdi Yeganeh](https://github.com/m-yeganeh)
- Tech Lead (API): [Mehdi Yeganeh](https://github.com/m-yeganeh)
- DB/SQL Owner: [Mehdi Yeganeh](https://github.com/m-yeganeh)
- DevOps/Infra: [Mehdi Yeganeh](https://github.com/m-yeganeh)
- Security: security@rismun.com, security@rismun.ir

**Review Policy**
- At least **1 code owner** approval for non‑DB changes
- At least **2 approvals** for DB schema/trigger/function changes

**Release Process**
1. Merge to `main` (all checks green)
2. Tag release `api-v1.0.0`
3. Build & push image `rismun/sportbooking/api-server:1.0.0`
4. Deploy to staging; verify migrations & smoke tests
5. Promote to production

**On‑call / Escalation**
- Primary: [Mehdi Yeganeh](https://github.com/m-yeganeh) — Slack: #oncall-api
- Incident runbook: see Ops wiki
