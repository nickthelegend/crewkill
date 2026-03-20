# Security Audit Report — Among Agents

**Date:** February 23, 2026
**Scope:** Full codebase review (`/Among_agents`)
**Auditor:** Claude Code (Opus 4.6)
**Repo Branch:** `main` @ commit `1a518608`

---

## Executive Summary

The Among Agents codebase contains **4 critical**, **4 high**, **4 medium**, and **2 low** severity security issues. The most urgent finding is a **private key committed to the git repository** that must be rotated immediately. Several architectural issues around client-side key storage and permissive CORS also require prompt attention.

| Severity | Count |
|----------|-------|
| Critical | 4     |
| High     | 4     |
| Medium   | 4     |
| Low      | 2     |

---

## Critical Findings

### C-01: Private Key Committed to Git Repository

| Field    | Detail |
|----------|--------|
| Severity | CRITICAL |
| Files    | `contracts/.env:4`, `server/.env:46` |
| Status   | Tracked in HEAD |
| First Committed | `ee875997` (Feb 11, 2026) |

**Description:**
The deployer/operator wallet private key is committed in plaintext:

```
PRIVATE_KEY=0x48c46fea...a7f6d1
OPERATOR_PRIVATE_KEY=0x48c46fea...a7f6d1
```

This key was used to deploy contracts on both Monad and opBNB testnets. Even if deleted from HEAD, the key remains recoverable from git history indefinitely.

**Impact:** Any wallet controlled by this key is fully compromised. An attacker with repo access can drain funds and impersonate the operator.

**Remediation:**
1. Rotate the key immediately — generate a new deployer wallet.
2. Transfer any remaining funds from the compromised wallet.
3. Remove the files from git tracking: `git rm contracts/.env server/.env`
4. Purge from git history using `git filter-repo` or BFG Repo Cleaner.
5. Redeploy contracts with the new key.

---

### C-02: Private Keys Stored in Browser localStorage

| Field    | Detail |
|----------|--------|
| Severity | CRITICAL |
| File     | `frontend/src/lib/operatorKeys.ts:67-72` |

**Description:**
The `OperatorKey` object (which includes `agentPrivateKey`) is serialized to JSON and stored in browser `localStorage`:

```typescript
export function saveOperatorKey(entry: OperatorKey): void {
  const existing = getOperatorKeys();
  existing.push(entry);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }
}
```

**Impact:** localStorage is accessible to any JavaScript running on the same origin. A single XSS vulnerability or malicious browser extension can extract all stored private keys.

**Remediation:**
- Move key management server-side with delegated signing.
- If client-side storage is required, use the Web Crypto API with non-extractable keys or a hardware wallet integration.

---

### C-03: Private Keys Displayed in UI

| Field    | Detail |
|----------|--------|
| Severity | CRITICAL |
| File     | `frontend/src/components/operator/CreateAgentModal.tsx:195-218` |

**Description:**
Agent private keys are rendered as copyable text in the Create Agent modal after generation. This exposes keys to screenshot attacks, screen recording, clipboard interception, and shoulder surfing.

**Impact:** Key material visible on screen can be captured by screen-sharing software, screenshots, or physical observation.

**Remediation:**
- Do not display raw private keys in the UI.
- Use server-side key custody or prompt users to export keys to a secure wallet file with encryption.

---

### C-04: No Root `.gitignore` File

| Field    | Detail |
|----------|--------|
| Severity | CRITICAL |
| Location | Repository root |

**Description:**
There is no `.gitignore` at the repository root. Subdirectory `.gitignore` files exist in `agent/`, `contracts/`, `frontend/`, and `server/`, but the absence of a root-level file means there is no safety net preventing accidental commits of sensitive files or build artifacts.

**Impact:** Directly caused C-01 (private key leak) and H-03/H-04 (committed artifacts).

**Remediation:**
Create `/.gitignore` with at minimum:

```gitignore
.env
.env.local
.env.*.local
node_modules/
dist/
out/
build/
*.key
*.pem
```

---

## High Severity Findings

### H-01: Overly Permissive CORS

| Field    | Detail |
|----------|--------|
| Severity | HIGH |
| File     | `server/src/api.ts:146` |

**Description:**
```typescript
app.use(cors());
```
CORS is configured with no origin restrictions, allowing any domain to make authenticated requests to the API.

**Impact:** Enables cross-site request forgery (CSRF) and unauthorized API access from malicious websites.

**Remediation:**
```typescript
app.use(cors({
  origin: ['https://yourdomain.com'],
  credentials: true,
}));
```

---

### H-02: Database Credentials in Committed `.env`

| Field    | Detail |
|----------|--------|
| Severity | HIGH |
| File     | `server/.env:24` |

**Description:**
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/amongus_onchain
```
Default PostgreSQL credentials are committed in the tracked `.env` file.

**Impact:** Database access if the server is network-accessible. Combined with C-01, an attacker has both blockchain and database access.

**Remediation:**
1. Remove `server/.env` from git (see C-01 remediation).
2. Change the PostgreSQL password.
3. Use environment variables injected at runtime via CI/CD or a secrets manager.

---

### H-03: `node_modules/` Committed to Git

| Field    | Detail |
|----------|--------|
| Severity | HIGH |
| Location | `agent/node_modules/` (15,433 files) |

**Description:**
The entire `node_modules` directory for the agent package is committed to the repository.

**Impact:**
- Massively bloats repository size.
- Vendored dependencies may contain their own vulnerabilities or secrets.
- Bypasses `npm audit` checks on install.

**Remediation:**
```bash
git rm -r --cached agent/node_modules/
echo "node_modules/" >> .gitignore
```

---

### H-04: Build Artifacts (`dist/`) Committed

| Field    | Detail |
|----------|--------|
| Severity | HIGH |
| Location | `agent/dist/` (1,959 files) |

**Description:**
Compiled JavaScript output is committed to the repository.

**Impact:** Increases repo size, can cause merge conflicts, and may contain stale code that diverges from source.

**Remediation:**
```bash
git rm -r --cached agent/dist/
echo "dist/" >> .gitignore
```

---

## Medium Severity Findings

### M-01: `Math.random()` for Security-Sensitive Operations

| Field    | Detail |
|----------|--------|
| Severity | MEDIUM |
| Files    | `server/src/WebSocketServer.ts:931, 993, 1104`, `agent/src/core/Agent.ts:426`, `frontend/src/lib/websocket/AgentWebSocketClient.ts:409` |

**Description:**
`Math.random()` is used for impostor role assignment, color selection, and request ID generation. `Math.random()` is not cryptographically secure and its output can be predicted.

**Impact:** An attacker could predict impostor assignments, gaining an unfair advantage in the game and potentially exploiting the wager system.

**Remediation:**
Replace with `crypto.getRandomValues()` (browser) or `crypto.randomBytes()` (Node.js) for all game-critical randomness:

```typescript
import { randomInt } from 'crypto';
const impostorIndex = randomInt(playerCount);
```

---

### M-02: Hardcoded HTTP URLs

| Field    | Detail |
|----------|--------|
| Severity | MEDIUM |
| Files    | `frontend/src/hooks/useOperatorKey.ts:8`, `frontend/src/lib/api.ts:1`, `frontend/src/components/operator/CreateAgentModal.tsx:14`, `agent/src/run-match.ts:20`, `agent/src/chains.ts:31` |

**Description:**
Multiple files contain hardcoded `http://localhost:*` URLs. If deployed without updating these to HTTPS endpoints, all API traffic (including bearer tokens and private keys) would be transmitted in cleartext.

**Impact:** Man-in-the-middle attacks can intercept authentication tokens and sensitive data.

**Remediation:**
- Use environment variables for all API/RPC URLs.
- Enforce HTTPS in production via server-side redirects and HSTS headers.

---

### M-03: Debug Information Disclosure

| Field    | Detail |
|----------|--------|
| Severity | MEDIUM |
| File     | `server/src/api.ts:97-106` |

**Description:**
```typescript
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === "development";
if (!privyUser) {
  res.status(401).json({
    error: "Invalid or expired Privy token",
    details: isDev ? "Token verification failed. Check server logs." : undefined,
  });
}
```
Development mode leaks implementation details in error responses. Since `NODE_ENV` defaults to `undefined` (which is truthy for `isDev`), this information is exposed unless `NODE_ENV` is explicitly set.

**Impact:** Helps attackers understand the authentication stack and identify attack vectors.

**Remediation:**
- Always set `NODE_ENV=production` in deployed environments.
- Consider removing verbose error details entirely from API responses.

---

### M-04: Missing Input Validation on API Endpoints

| Field    | Detail |
|----------|--------|
| Severity | MEDIUM |
| File     | `server/src/api.ts:255` |

**Description:**
```typescript
const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
```
Query parameters are cast and parsed without validation. No checks for negative numbers, non-numeric strings, or boundary values across multiple endpoints.

**Impact:** Unexpected behavior, potential denial of service through malformed input.

**Remediation:**
Adopt a validation library (e.g., `zod`) for all API input:

```typescript
const schema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
```

---

## Low Severity Findings

### L-01: Wager Disable Flag

| Field    | Detail |
|----------|--------|
| Severity | LOW |
| File     | `server/src/WebSocketServer.ts:34` |

**Description:**
```typescript
const WAGERS_DISABLED = process.env.DISABLE_WAGERS === "true";
```
An environment variable can disable the entire wager system. If accidentally set in production, games would run without financial stakes.

**Remediation:**
- Remove this flag or restrict it to development builds only.
- Log a warning if wagers are disabled.

---

### L-02: Dust Amounts in Wager Distribution

| Field    | Detail |
|----------|--------|
| Severity | LOW |
| File     | `contracts/src/WagerVault.sol:176-178` |

**Description:**
```solidity
uint256 protocolFee = (game.totalPot * protocolFeePercent) / 100;
uint256 distributablePot = game.totalPot - protocolFee;
uint256 winningsPerPlayer = distributablePot / winners.length;
```
Integer division may leave small remainder amounts (dust) locked in the contract permanently.

**Remediation:**
- Add a sweep function for the contract owner to recover dust.
- Or allocate remainders to the protocol fee.

---

## Verified Safe

The following areas were reviewed and found to be properly implemented:

| Area | Status | Notes |
|------|--------|-------|
| XSS | Safe | No `dangerouslySetInnerHTML`, `innerHTML`, or `eval()` |
| SQL Injection | Safe | Prisma ORM with parameterized queries |
| Command Injection | Safe | No `exec()`/`spawn()` with user input |
| Smart Contract Reentrancy | Safe | Checks-effects-interactions pattern correct |
| `tx.origin` Usage | Safe | Not used in custom contracts |
| API Authorization | Safe | Endpoints protected with `requireOperatorAuth` / `requirePrivyAuth` |
| Privy Secrets | Safe | Only placeholder values in `.env.example` files |

---

## Remediation Priority

### Immediate (Day 1)
- [ ] Rotate the compromised private key (C-01)
- [ ] Transfer funds from compromised wallet (C-01)
- [ ] Create root `.gitignore` (C-04)
- [ ] Remove `.env` files from git tracking (C-01, H-02)
- [ ] Remove `node_modules/` and `dist/` from git tracking (H-03, H-04)

### Short-Term (Week 1)
- [ ] Purge private key from git history with `git filter-repo` or BFG Repo Cleaner (C-01)
- [ ] Move operator key management server-side (C-02, C-03)
- [ ] Restrict CORS to allowed origins (H-01)
- [ ] Change database password (H-02)

### Medium-Term (Week 2-3)
- [ ] Replace `Math.random()` with cryptographic randomness (M-01)
- [ ] Move all URLs to environment variables and enforce HTTPS (M-02)
- [ ] Add input validation with `zod` on all API endpoints (M-04)
- [ ] Remove debug information from error responses (M-03)
- [ ] Install pre-commit secrets scanner (`gitleaks` or `git-secrets`) (preventive)

### Low Priority
- [ ] Remove or restrict wager disable flag (L-01)
- [ ] Add dust recovery to WagerVault contract (L-02)

---

## Appendix: Files Reviewed

| Directory | Files Reviewed | Key Files |
|-----------|---------------|-----------|
| `contracts/` | Solidity sources, deployment scripts, `.env` | `GameSettlement.sol`, `WagerVault.sol`, `AgentRegistry.sol` |
| `server/` | All TypeScript sources, Prisma schema, `.env` | `api.ts`, `WebSocketServer.ts`, `ContractService.ts`, `PrivyWalletService.ts` |
| `frontend/` | All components, hooks, lib utilities, `.env.local` | `operatorKeys.ts`, `CreateAgentModal.tsx`, `Providers.tsx`, `api.ts` |
| `agent/` | All TypeScript sources | `Agent.ts`, `ActionSubmitter.ts`, `OperatorManager.ts` |
| Git history | 50 most recent commits, deleted file history, secret search | Commits `ee875997` through `1a518608` |
