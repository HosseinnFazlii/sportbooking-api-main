# Security Policy — SportBooking API (Rismun Internal)

This repository is proprietary and for internal use by **Rismun**. If you believe you have found a security issue, please follow the process below.

## Supported Branches
- `main` (active development) — security fixes accepted.
- Released tags `api-v*` — patch branches created as needed.

## Reporting a Vulnerability
Email **security@rismun.com** (internal) or open a **PRIVATE** issue visible only to the security/maintainers team.
Include:
- A clear description of the issue & impact
- Steps to reproduce (PoC)
- Affected endpoints/modules and environment (dev/staging/prod)
- Logs/stack traces (redact secrets/PII)
- Your contact info

> Do not create public issues or discuss vulnerabilities publicly.

## Service-Level Targets
- **Acknowledgment:** within **2 business days**
- **Triage & severity assignment:** within **5 business days**
- **Fix ETA:** depends on severity
  - **Critical** (RCE, auth bypass, data exfiltration): hotfix ASAP
  - **High** (privilege escalation, data tampering): next sprint or hotfix
  - **Medium/Low:** scheduled in backlog

You’ll be kept informed of progress. Coordinated disclosure only after fix deployment.

## Scope
**In scope**
- sportbooking-api codebase (NestJS, TypeORM, migrations, Dockerfiles)
- API container images & configs
- SQL functions/triggers/constraints that protect booking integrity

**Out of scope**
- Third‑party services and libraries (report upstream)
- Social engineering, physical attacks

## Testing & Safe Harbor
- Test only on dev/staging environments unless explicitly authorized.
- Do not access other users’ data beyond your own test accounts.
- Avoid performance‑impacting tests during business hours.

## Handling Secrets
- Never commit secrets. Use `.env` files or secret managers.
- Report leaked secrets immediately to security@rismun.com and maintainers.

Thanks for helping keep Rismun systems secure.
