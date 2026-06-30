# Lazynext Security Architecture

Security architecture, authentication, and best practices for the Lazynext platform.

---

## Authentication: JWT HS256

All user authentication is handled via the `better-auth` library with HS256-signed JSON Web Tokens.

### Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_abc123",
    "email": "user@example.com",
    "role": "editor",
    "iat": 1719445200,
    "exp": 1719448800,
    "jti": "unique-token-id"
  }
}
```

### Configuration

Set these environment variables in `.env.local`:

```env
BETTER_AUTH_SECRET=<64-character-random-secret>
BETTER_AUTH_URL=http://localhost:3000
```

Generate a secure secret:
```bash
openssl rand -hex 32
```

### Token Lifecycle

| Token Type       | Lifetime     | Storage Location       |
|------------------|--------------|------------------------|
| Access Token     | 1 hour       | Memory only (client)   |
| Refresh Token    | 7 days       | HttpOnly Secure cookie |
| Session Token    | 24 hours     | Redis (Upstash)        |

### Authentication Flow

1. User authenticates via email/password or OAuth provider.
2. `better-auth` issues an access token (JWT) and refresh token.
3. Client stores the access token in memory and attaches it to all API requests via `Authorization: Bearer <token>`.
4. API Gateway (`rust/api-gateway`) validates the JWT signature, expiry, and subject on every request.
5. When the access token expires, the client calls the refresh endpoint with the HttpOnly refresh cookie.
6. Invalidated tokens are tracked in Redis with their remaining TTL.

### Token Verification (API Gateway)

```rust
// rust/api-gateway/src/rbac.rs
pub async fn authorize_request(req: Request, next: Next) -> Result<Response, StatusCode> {
    let validation = Validation::new(Algorithm::HS256);
    let token_data = jsonwebtoken::decode::<Claims>(token, &DecodingKey::from_secret(secret), &validation)?;
    if is_blacklisted(&token_data.claims.jti).await {
        return Err(AuthError::TokenRevoked);
    }
    Ok(token_data.claims)
}
```

---

## CSRF Protection

### SameSite Cookies

All session and refresh cookies are set with:

```
Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=604800
```

### Anti-CSRF Token

For state-changing operations, the client must include a CSRF token:

```
X-CSRF-Token: <token>
```

The token is served by the server on initial page load and validated on every `POST`, `PUT`, `PATCH`, and `DELETE` request. The token is regenerated on each successful login.

### Origin Header Validation

The API Gateway validates the `Origin` and `Referer` headers against an allowlist as part of CSRF protection in `rust/api-gateway/src/csrf.rs`:

  process.env.NEXT_PUBLIC_APP_URL,
  'http://localhost:3000',
];
```

### Implementation

CSRF protection is implemented as an Axum middleware layer (`rust/api-gateway/src/csrf.rs`). Requests that fail CSRF validation receive a 403 response with no additional detail.

---

## Rate Limiting

Rate limiting is enforced at two layers.

### API Gateway Layer (Rust)

The Axum API gateway applies per-IP and per-user rate limits using a token bucket algorithm backed by Redis (Upstash).

**Default Limits**:

| Endpoint Group    | Limit              | Window |
|-------------------|--------------------|--------|
| Auth (/auth/*)    | 20 requests        | 1 min  |
| Read API          | 300 requests       | 1 min  |
| Write API         | 60 requests        | 1 min  |
| Render Jobs       | 10 requests        | 1 min  |
| Export            | 5 requests         | 1 min  |
| AI Orchestration  | 30 requests        | 1 min  |
| Generative Studio | 20 requests        | 1 min  |

**Response on Limit Exceeded** (429):
```json
{
  "error": "Too many requests",
  "detail": "Rate limit exceeded. Retry after 30 seconds.",
  "retry_after_seconds": 30
}
```

Headers returned on all responses:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 287
X-RateLimit-Reset: 1719445260
```

### Next.js Middleware Layer

Additional rate limiting at the Next.js edge:

```rust
// rust/api-gateway/src/csrf.rs
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
});
```

---

## Stripe Webhook HMAC Verification

Stripe webhooks are verified using HMAC-SHA256 signature validation. The raw request body and the `stripe-signature` header are validated against the webhook signing secret.

### Implementation

```typescript
// apps/web/src/app/api/stripe/webhook/route.ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle event
  switch (event.type) {
    case "checkout.session.completed": { /* ... */ }
    case "customer.subscription.updated": { /* ... */ }
    case "customer.subscription.deleted": { /* ... */ }
  }

  return Response.json({ received: true });
}
```

### Security Requirements

- The `STRIPE_WEBHOOK_SECRET` must never be exposed to the client.
- The webhook endpoint must accept the raw request body (no body parsing middleware before HMAC verification).
- Webhook events are processed idempotently using the `event.id` as the idempotency key.
- Webhook endpoints are excluded from CSRF protection.

---

## C2PA Provenance Signing

Lazynext signs all exported media with C2PA (Coalition for Content Provenance and Authenticity) provenance manifests. This cryptographically binds the media to its edit history, creator identity, and AI-generation disclosures.

### Architecture

```
Export Pipeline:
  Raw Frames → Encode → C2PA Manifest Injection → Signed Output
                              ↑
                    rust/provenance/src/
                    - c2pa.rs
                    - lib.rs
```

### Manifest Contents

```json
{
  "c2pa_manifest": {
    "claim_generator": "Lazynext/1.2.0",
    "assertions": [
      {
        "label": "stds.schema-org.CreativeWork",
        "data": {
          "author": {"@type": "Person", "name": "user_abc123"},
          "date_created": "2026-06-27T10:30:00Z"
        }
      },
      {
        "label": "lazynext.edit_history",
        "data": {
          "project_id": "proj_abc123",
          "operations_count": 142,
          "source_media_hashes": ["sha256:abc...", "sha256:def..."],
          "ai_generated_content": ["clip_5_style_transfer"]
        }
      }
    ],
    "signing_algorithm": "ES256",
    "signing_certificate_url": "https://c2pa.lazynext.app/cert.pem"
  }
}
```

### Key Management

- Signing keys are stored in Azure Key Vault (production) or OPFS (local development).
- The signing certificate is published at a public URL for downstream verification.
- Private keys are never exposed to the client; signing happens server-side in the render service.

### Verification

Any C2PA-compliant tool can verify the provenance of Lazynext exports:
```bash
c2patool verify output.mp4
```

---

## API Key Management

### Generation

API keys are generated for programmatic access to the Lazynext API (e.g., CI/CD integrations, third-party tooling).

```bash
# Generate via CLI
cargo run --bin lazynext-cli -- api-key create --name "CI Pipeline" --scopes "read:projects,write:export"
```

### Key Format

```
lnx_live_abc123def456ghi789jkl012mno345pqr678stu
│   │    └───────────────── 32 bytes of random entropy ─────────────────┘
│   └── Environment prefix (live / test)
└── Platform prefix
```

### Storage

API keys are stored in the database as SHA-256 hashes. The plaintext key is shown only once at creation time.

```sql
-- schema excerpt
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  prefix VARCHAR(12) NOT NULL,    -- first 8 chars for identification
  scopes TEXT[] NOT NULL,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
```

### Usage

Clients include the API key in the `Authorization` header:

```
Authorization: Bearer lnx_live_abc123def456...
```

The API Gateway extracts the key, hashes it, and looks up the hash in the database to resolve the associated user and scopes.

### Scope Reference

| Scope              | Permissions                          |
|--------------------|--------------------------------------|
| `read:projects`    | List and get project metadata        |
| `write:projects`   | Create and update projects           |
| `read:timeline`    | Read timeline elements               |
| `write:timeline`   | Modify timeline elements             |
| `read:assets`      | List and download project assets     |
| `write:assets`     | Upload and manage assets             |
| `write:export`     | Submit export/render jobs            |
| `admin`            | Full administrative access           |

---

## Security Best Practices

### Server-Side

1. **Secrets Management**: All secrets stored in environment variables or Azure Key Vault. Never hardcoded, never committed. Use `.env.example` as the canonical reference.

2. **Dependency Auditing**: Run `cargo audit` and `bun audit` in CI on every PR. Vulnerabilities at `critical` or `high` severity block merge.

3. **HTTPS Only**: All production traffic uses TLS 1.3. HSTS header set with `max-age=31536000; includeSubDomains; preload`.

4. **Input Validation**: All user input is validated at the API boundary. Use typed schemas (Drizzle for DB, serde for Rust endpoints, Zod for Next.js API routes). Reject unexpected fields.

5. **SQL Injection Prevention**: Parameterized queries via Drizzle ORM throughout. No raw SQL string interpolation.

6. **CORS**: Explicit origin allowlist. No wildcard origins in production.

7. **Content Security Policy**: Strict CSP headers set via Next.js config (`apps/web/next.config.ts`). Script sources limited to self and the WASM loading origin.

8. **Log Sanitization**: Never log tokens, passwords, or personally identifiable information. Use a structured logger that redacts sensitive fields.

### Client-Side

1. **No Secrets in Client Code**: All `NEXT_PUBLIC_*` variables are by-design safe for client exposure (URLs, not keys).

2. **Token Storage**: Access tokens are stored in JavaScript memory only (not localStorage, not sessionStorage). Refresh tokens are HttpOnly cookies.

3. **WASM Integrity**: WASM modules loaded from the same origin. Subresource Integrity (SRI) hashes verified for all external scripts.

4. **XSS Prevention**: React's built-in escaping prevents XSS. `dangerouslySetInnerHTML` is lint-blocked. Content rendered from user input is sanitized.

### Deployment

1. **Container Hardening**: Docker images built from `distroless` base images where possible. Run as non-root user. Read-only root filesystem for stateless services.

2. **Network Segmentation**: All services communicate over the internal `lazynext-network` Docker bridge. Only the API Gateway (8005) and web app (3000) are exposed through the Azure Container Apps ingress.

3. **PostgreSQL**: TLS enforced for all connections. Private VNet, no public endpoint. Automated backups every 6 hours with 30-day retention.

4. **Redis (Upstash)**: TLS enforced. Token-based authentication. Used only for caching and rate limiting — no persistent data.

### Incident Response

1. **Key Rotation**: In the event of a suspected key compromise, rotate `BETTER_AUTH_SECRET` immediately. All existing sessions will be invalidated.

2. **Token Revocation**: Revoke a specific user's sessions via:
   ```bash
   bun run scripts/revoke-sessions.ts --user-id user_abc123
   ```

3. **Audit Logs**: All authentication events, API key usage, and administrative actions are logged to a tamper-evident audit trail in PostgreSQL (`audit_log` table).

4. **Contact**: Security issues should be reported to `security@lazynext.app` (PGP key available at `https://lazynext.app/.well-known/security.txt`).

---

## Compliance

Lazynext adheres to:

- **SOC 2 Type II**: Annual audit for security, availability, and confidentiality.
- **GDPR**: Data processing agreement available. EU data residency via Azure West Europe region option.
- **C2PA 1.3**: Content provenance specification compliance for all exported media.

For compliance documentation or data processing inquiries, contact `compliance@lazynext.app`.
