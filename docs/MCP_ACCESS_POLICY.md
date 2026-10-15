# MCP connection policy (proposal; not an installation report)

Connect only tools with a proven task. Review account, scopes, read/write ability, rate limits, and cost before enabling.

| Service | Intended purpose | Default permission |
|---|---|---|
| GitHub | Code and PRs | Read; branch/PR writes for approved development |
| Notion | CRM and service status | Read; changes after source verification |
| Google Drive | Documents and assets | Read; edits only for requested files |
| Gmail | Email context | Read; draft/send only when explicitly requested |
| Calendar | Availability and events | Read; event edits only when explicitly requested |
| Vercel | Preview deployments | Inspect first; production deploy requires approval |

Do not assume the 24 example MCP tools are installed, supported, or desirable. Confirm actual connectivity with a read-only test and log failures; never treat connector discovery as authorization to mutate. Avoid bulk queries, repeated full database fetches, and polling loops.
