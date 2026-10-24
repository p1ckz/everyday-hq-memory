# Everyday HQ AI feasibility — 24 October 2026

Status: prepared on the `ai-assistant-preparation` branch. The published diary remains 1.10.2. No provider account is connected, no real inference has been run through this integration, and nothing has been billed.

## Options checked against primary documentation

| Option | Zero-cost allowance and security | Practical fit |
| --- | --- | --- |
| Cloudflare Workers AI | Workers Free provides 10,000 neurons/day, resetting at 00:00 UTC; exhaustion fails rather than charging. Workers Free and SQLite Durable Objects have separate hard free allowances. No upgrade, payment details or paid fallback is needed for this design. | Recommended for a simple personal deployment: one provider account, direct model binding, no provider API key in the app. Global service; no UK exclusion identified in the reviewed material, but actual UK phone access is not yet tested. |
| Gemini Developer API | Selected models have free input/output. Published limits direct users to their account's AI Studio limits; actual capacity is not guaranteed. Keep the Cloud project unbilled. UK is explicitly supported. | Strong alternative for general conversation, writing and reasoning. Free quotas/model availability need account-level verification. Still needs a protected server-side API key. |
| OpenRouter free models | Free routes are limited to 20 requests/minute and 50/day without buying credits. The higher 1,000/day allowance requires spending and is excluded. Free model availability changes. | Useful alternative, but routing adds another processor and upstream privacy/availability varies. Lock a free model and disallow paid fallback; no purchased credits or automatic top-ups. UK account eligibility still requires verification. |
| Groq Free | Current published free limits include GPT-OSS 120B at 30 requests/minute, 1,000/day, 8,000 tokens/minute and 200,000/day. Any limit can stop a request. | Promising high-speed alternative. Published production-model speed is not a measured speed on Nathan's phone. Separate account/key and a protected backend required; account eligibility and free-plan limits need confirmation. |
| On-device WebLLM | No inference API bill; local browser inference uses WebGPU and downloaded model weights. Safari 26 added WebGPU. | Possible experiment, not yet a dependable replacement for capable cloud conversation on this phone. Model downloads, memory, thermal/battery use, mobile tab eviction and model quality require a real-device trial. WebGPU availability alone does not prove a model will run reliably. |
| Apple Foundation Models | Native Swift framework; Apple Intelligence-supported hardware required. | Not a direct JavaScript API for the existing GitHub Pages app. The standard iPhone 15 is absent from Apple's supported Intelligence hardware list. No native rebuild proposed. |
| Hugging Face Inference Providers | Current pricing says free users must purchase credits or upgrade; old claims about free monthly credits are no longer dependable. | Excluded under the strict £0 requirement. |

Cloudflare privacy: standard stateless inference is normally not retained after processing and delivery, and Customer Content is not used for model training. Exceptions and operational metadata retention apply. This is external processing, not on-device privacy or guaranteed UK-only processing. We do not enable AI Gateway content logs, content caching or server-side chat storage.

Gemini privacy has an important UK exception: its paid-service data-use terms also apply to UK users' unpaid quota. Those terms say prompts/responses are not used to improve products, but limited safety/legal retention and international processing remain. The generic free-tier “used for improvement” table must be read with these terms.

OpenRouter says prompt/completion logging is off by default, but upstream provider policy and privacy routing still matter. Groq retains operational metadata and describes limited customer-data retention exceptions. Neither service should be described simply as “nothing leaves the device”.

## Quality, speed and conversation memory

All cloud options can provide real generative multi-turn chat. No head-to-head quality or latency benchmark was run, so there is no verified ranking of their answers or speed. General expectations based on model descriptions: Gemini Flash and GPT-OSS are strong alternatives; the chosen Qwen model offers a useful balance of general conversation and free capacity. None is promised to match ChatGPT's current frontier model or reliability.

The prepared gateway fixes `@cf/qwen/qwen3-30b-a3b-fp8`, a Cloudflare-hosted text/reasoning model with a 32,768-token window. The app sends up to 20 recent messages, dropping older messages when its local context budget is exceeded; it says earlier chat may be outside context. Local saved history is not unlimited model memory, model training, live browsing or an external account connection. Text-only requests use no tools.

Free plans can change or be withdrawn. £0 is enforced by retaining the Free plans and their hard limits, not a promise that a provider will offer identical terms forever. The prepared service is disabled by default and has no paid-routing code.

## Sources

- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/durable-objects/platform/pricing/
- https://developers.cloudflare.com/workers-ai/platform/data-usage/
- https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/rate-limits
- https://ai.google.dev/gemini-api/docs/available-regions
- https://ai.google.dev/gemini-api/terms
- https://openrouter.ai/pricing
- https://openrouter.ai/support/
- https://openrouter.ai/docs/guides/routing/routers/free-router
- https://console.groq.com/docs/rate-limits
- https://console.groq.com/docs/models
- https://console.groq.com/docs/your-data
- https://webllm.mlc.ai/docs/
- https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- https://developer.apple.com/apple-intelligence/
- https://support.apple.com/en-us/121115
- https://huggingface.co/docs/inference-providers/en/pricing
