# Optional AI — deployment gate, not an activated feature

The live app is still 1.10.2. Keep GitHub Pages on `main`, root. Do not merge this branch or publish its staged 1.11.0 until real service tests and browser tests pass. Existing date-control, toast and reader-race repairs were completed before this work.

## What is prepared

- Dedicated AI chat page, reached through the existing Assistant section.
- Local new/continue/delete conversations, independent chat export and per-chat draft recovery. Chat database `EverydayHQ_AI_v1` is separate from the unchanged `EverydayHQ_v13` diary; layout tests use separate test namespaces. Journal backup schema remains `everydayHQ.v2`; diary backups do not contain AI chats, service codes or AI drafts.
- Multi-turn text requests, retry, stop/45-second timeout, quota/error messages and safe text rendering. Actual AI quality/latency is NOT verified by mock tests.
- Local diary search and a maximum of three explicitly selected excerpts. Each is limited to the first 1,500 characters, visibly labelled if truncated. Searching does not transmit anything. Sharing requires confirmation. Chats containing diary-derived information require confirmation on later sends too; no background memory access or upload. Failed retries require reselecting excerpts to resend them.
- A fixed Cloudflare Workers AI model binding, without a provider API key in JavaScript or the repository. No external fallback provider, agent tools, browser access, images or account access.
- An authenticated gateway, fixed output limit of 1,024 tokens, maximum 20 messages/20,000 encoded bytes, transactional account-wide cap of 50 attempts/day and five/minute. Failed/aborted requests may count. This counter is NOT the provider's remaining neuron balance; other account use may exhaust Cloudflare's shared allowance sooner.
- The budget object stores only day/count/request timestamps. No prompts or responses are stored on the server or written to application logs. Chat content is still processed externally by Cloudflare under its current policies.

## Required free account authorisation

Nathan must securely sign in to an existing Cloudflare account, or personally create a free one and accept any terms. Do not ask for passwords, OTPs or API tokens in chat. Do not add payment details, activate Workers Paid, buy credits, add a custom domain, enable a paid gateway/provider, or accept a paid trial.

Check in the actual account that Workers is **Free** and its free AI binding and SQLite Durable Objects are available. If a payment/upgrade is required, STOP; leave the diary live version alone. Free plan verification is necessary because source code cannot stop a person separately upgrading an account.

Deploy `ai-gateway.mjs` with `wrangler-ai.toml`. A build-only check can use:

```
npx --yes wrangler@4.152.0 deploy --dry-run --config wrangler-ai.toml
```

A real deployment is a separate step, only after secure authorisation. The config's `FREE_ONLY_CONFIRMED` deliberately defaults to `false`, so the service fails closed. Set it true only after the account plan check. Keep observability disabled. Use the SQLite migration, not a paid legacy KV Durable Object.

Set server secret `APP_ACCESS_TOKEN` through a secure credential flow. Generate at least 32 random bytes; do not publish it, put it in a URL, log it, or include it in screenshots. This is a personal service access code, NOT a Cloudflare API token. The frontend connection form intentionally stores that user-entered service code locally after a successful status check. Treat this as a device credential: keep the phone/browser secure; Disconnect removes it. No account-management credentials go into Everyday HQ.

Use the actual deployed `https://...workers.dev` service origin. The gateway allows only `https://p1ckz.github.io` and also requires the private code: CORS alone is not authentication. The staged CSP allows workers.dev connections but no request is made on diary startup, chat startup or local memory search. Connect checks `/status` without inference. Send alone invokes `/chat`.

## Verification before publishing

Run all regression and AI tests. Mocks are explicitly synthetic and do not establish provider quality or live integration. A real account-backed test must verify `/status`, a general question, a follow-up using earlier context, writing/planning, a bounded answer, an invalid-code rejection and real quota/error behaviour where practical. Use synthetic data only. Never run 50 paid/real requests just to test the cap; the concurrency/cap test is local.

Then test the actual browser flow: connect, chat, new/continue/delete, refresh/draft recovery, cancel and approve a synthetic memory excerpt, explicit repeat consent, retry/stop, no-key leakage, exports, mobile widths and update preservation. Confirm worker/app versions match before atomically publishing HTML and service worker through the unchanged Pages configuration.

Physical iPhone keyboard, Home Screen lifecycle, actual UK connection speed and model quality remain unverified until tested on that device. Chat export compatibility is its own format; no AI-chat import is claimed.

Preparation check: Wrangler 4.152.0 dry-run bundled the Worker successfully with AI and SQLite Durable Object bindings and `FREE_ONLY_CONFIRMED=false`. All six local suites passed. No live account-backed provider invocation was performed.
