# Recommended workspace structure (template; not an existing migration)

Use this as a proposal for a **private** workspace, not as permission to move or publish existing files.

```
work/
  company/            # cross-project guidance and indexes
  clients/            # one directory per client, private access
    CLIENT_ID/
      README.md        # purpose, canonical source links, status
      decisions.md     # short durable decisions, no secrets
      handoff.md       # latest work, next steps
  products/            # one directory per product
    PRODUCT_ID/
      README.md
      decisions.md
      handoff.md
  content/             # media workflows and approved assets
```

Use links/pointers to Notion, Drive, and private knowledge as canonical sources; do not duplicate CRM, financial records, credentials, or customer media. Avoid moving existing folders until ownership and consumers are audited. Each agent should read the nearest relevant README and only required files.
