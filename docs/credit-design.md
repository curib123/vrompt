# Credit design and provider economics

Implemented September 8, 2026. Amounts below are USD estimates, not reconciled provider invoices or a guarantee of profit.

## Customer allowances

| Plan    | Monthly shared credits | Daily Auto messages | Access                                                                  |
| ------- | ---------------------: | ------------------: | ----------------------------------------------------------------------- |
| Guest   |                      3 |                   1 | Temporary Auto text chat; existing network limits also apply            |
| Free    |                     30 |                   5 | Auto text chat; no manual models, files or image generation             |
| Starter |                    100 |                  15 | Economical manual models, one file per message, 5 projects              |
| Pro     |                    250 |                  50 | Auto, manual models, up to 2 files per message, priced image generation |
| Max     |                    600 |                 100 | Pro models/tools, 100 projects, 150 workflows and higher concurrency    |

The public subscriptions are Free, Starter, Pro and Max, in that order. Guest remains a temporary trial, outside subscription pricing. Local prices are **$0 / $4.99 / $9.99 / $19.99 monthly**, with modeled provider budgets of **$0.24 / $0.80 / $2.00 / $4.80** per calendar allowance. Prices and credits are editable in Admin. Only Gemini, ChatGPT (OpenAI API models), Claude and Mistral are offered. Groq has been retired from the catalog, manual selection and Auto routing; historical identities and ledger records are preserved. No Grok integration is enabled.

The revised prices increase from $2.99 / $5.99 / $14.99 while increasing paid credits from 40 / 100 / 300. The $4.99 entry point is a market-positioning choice, not proof of willingness to pay: [Poe's official purchase FAQ](https://help.poe.com/hc/en-us/articles/19945140063636-Poe-Purchases-FAQs) also lists plans starting at $4.99, with different features and allowances. Validate conversion and retention before further increases.

New development seeds use these defaults. `apply-credit-design.ts` makes a backup and refuses to run with live/pending subscriptions or reserved generations. Paid prices are preserved unless `--update-prices` is explicitly supplied; that flag requires USD plans. Changed prices/credits receive a pricing-history entry. Usage counters and history are preserved. Production needs a separate reviewed rollout for existing customers.

All models share the monthly credit balance. A response also uses one message from its selected bucket's daily and monthly limits. Those model limits do not grant additional credits. Auto uses its own bucket. Reservations count immediately to prevent concurrent overspending. Successful or partially consumed responses charge the quoted credits; failures without known consumption release the reservation. Regeneration is a new request and is priced visibly.

Daily limits reset at 00:00 UTC; monthly credits and monthly message limits reset on the first of the calendar month at 00:00 UTC. Unused monthly credits do not roll over. The UI displays local reset times. Guest network throttles use the existing rolling Redis windows.

## Predictable prices and routing

One credit admits **$0.008 of modeled provider work**. This leaves 25% headroom to a nominal $0.01 provider allowance. A credit is an internal usage unit, not a cash balance or redeemable currency.

For manual models, the fixed quote is:

```
input_bound = min(plan.maxContext, model.maxContext)
output_bound = min(plan.maxOutput, model.maxOutput)
input_rate = max(uncached_input_rate, cached_input_rate, cache_write_rate)
estimated_cost_bound = (input_bound * input_rate + output_bound * output_rate) / 1,000,000
credits = max(configured_minimum_credits, ceil(estimated_cost_bound / 0.008))
```

Using the configured maximum context/output keeps the price predictable before sending and covers expensive long conversations. It intentionally costs more than exact-token pass-through on short premium requests. Rates are USD; unknown, invalid, non-USD and entirely unpriced models fail closed. Administrator price changes alter future quotes; the client's `maxCredits` ceiling prevents silently exceeding the displayed price. Omitting that ceiling never bypasses the server's calculated charge or reservation.

Auto chat is **1 credit**. Its economical pool contains GPT-4o mini, Gemini 2.5 Flash-Lite and Mistral Small. Free has an 8,192-token context budget, 1,024-token output cap and one provider attempt; Starter uses 16,384 / 2,048 and one attempt. Pro and Max Auto use 16,384 / 2,048 with at most two attempts. Routing still checks suitability, capabilities and health. The **sum** of the estimated bounds of every possible attempt must fit the quote; retries do not get a fresh budget. Expensive or unpriced candidates are skipped before reserving credits or calling providers.

Pro and Max manual policies use 32,768 context / 4,096 output caps (further limited by the model); Starter manual policies use 16,384 / 2,048 with the economical model pool. At the verified current registry rates:

| Selection/task                                         | Credits per request |
| ------------------------------------------------------ | ------------------: |
| Auto text                                              |                   1 |
| GPT-4o mini, Gemini 2.5 Flash-Lite, Mistral Small text |                   1 |
| Claude Haiku 4.5 text                                  |                   8 |
| Gemini 2.5 Flash Image text-only                       |                  17 |
| Gemini 2.5 Flash Image generation                      |                  33 |
| Auto image generation                                  |                  35 |

The image-specialist model uses a conservative $30/million output rate even for its text-only quote; economical models are better value for ordinary chat. Auto will not route text to it at one credit. Gemini text requests explicitly request text output. GPT-4o mini image attachments use low detail (a fixed 2,833 input tokens); this trades fine image detail for predictable cost. Use another available vision model for detailed images. PDF/context estimates remain conservative local estimates, not provider token counts.

Images require a verified `additionalPrices.maxImageOutputCostUsd` covering **all output and tool charges** per request. Gemini 2.5 Flash Image has a $0.25 output allowance, covering its 8,192-token ceiling at $30/million. The larger of that allowance and the configured output-token cost is added to input cost. Auto's 35-credit budget can admit one such image attempt. OpenAI and Mistral external image tools remain unavailable until their complete tool charges and enforceable limits are configured. A text-token price alone is insufficient.

## Economics and operational limits

Each paid tier budgets less than 25% of its regular price for provider work under one fully consumed calendar allowance. This is provider-only contribution, not net margin.

| Plan    |  Price | Modeled provider budget | Remaining before other costs | Provider-only contribution |
| ------- | -----: | ----------------------: | ---------------------------: | -------------------------: |
| Starter |  $4.99 |                   $0.80 |                        $4.19 |                      84.0% |
| Pro     |  $9.99 |                   $2.00 |                        $7.99 |                      80.0% |
| Max     | $19.99 |                   $4.80 |                       $15.19 |                      76.0% |

As an illustrative operating scenario only, assume processing costs of 5% + $0.30 per payment and another $2 per paid account for hosting, operations and free-user subsidies. Those are planning assumptions, not PayMongo's quoted fees or measured operating costs. The remaining amounts would be $1.64 / $5.19 / $11.89. With two fully consumed calendar allowances in a billing period, they fall to $0.84 / $3.19 / $7.09. Replace these assumptions with actual costs; higher acquisition, refunds or subsidies can erase that contribution.

Free's 30-credit envelope is $0.24/account/month. Under the current cheap pool and smaller limits, 30 successful maximum-size text requests model approximately $0.0553 or less; use the larger credit envelope for planning. Ten fully used free allowances therefore add a modeled $2.40 to provider costs. Unreported billable failures can add spend outside successful credit consumption. Do not count provider promotional free tiers as permanent margin.

Calendar resets are independent of subscription anniversaries. A paid billing period can overlap **two calendar credit allowances**, especially immediately after an upgrade; budget $1.60 / $4.00 / $9.60 for Starter / Pro / Max in that period. This implementation does not change existing reset semantics or prorate credits. Annual/multi-month plans must fund each monthly allowance; compare effective prices after promotions and in the same currency.

Payment processing, hosting, storage, support, acquisition, free accounts, refunds, taxes and currency conversion are not included above. Use actual processor terms and operating spend before setting a net-margin target. The admin plan editor exposes the modeled allowance budget; analytics and reconciliation remain the source for measured provider costs and cash contribution. Audit promotions and large manual credit grants against the same envelope. Existing free-account abuse protections must be monitored; one person creating multiple accounts still changes acquisition economics.

Recheck provider rates when adding/changing a model, and regularly reconcile usage records with invoices. Token estimates and configured output/tool limits are not a provider-enforced dollar spending cap; configure project/account spending limits at each provider as an additional operational control. A catalog alias can change underlying versions or prices. No real generation or payment data was available in this local database to validate realized margins.

## Pricing references

Verified against official provider pages on September 8, 2026:

- [OpenAI GPT-4o mini](https://developers.openai.com/api/docs/models/gpt-4o-mini): $0.15 input / $0.075 cached / $0.60 output per million tokens.
- [OpenAI image token accounting](https://developers.openai.com/api/docs/guides/images-vision): GPT-4o mini low-detail images use 2,833 tokens.
- [Google pricing](https://ai.google.dev/gemini-api/docs/pricing): Gemini 2.5 Flash-Lite $0.10 input / $0.01 cached / $0.40 output; Flash Image $0.30 input and $30/million image-output tokens (approximately $0.039 per 1024-pixel image).
- [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing): Haiku 4.5 $1 input / $1.25 five-minute cache write / $0.10 cache read / $5 output.
- [Mistral Small 4](https://docs.mistral.ai/models/mistral-small-4-0-26-03): $0.15 input / $0.015 cached / $0.60 output.

## Local operations and verification

Inside the API development container, from `/workspace/apps/api`:

```
npx tsx prisma/apply-credit-design.ts
npx tsx prisma/apply-credit-design.ts --apply
npx tsx prisma/apply-credit-design.ts --apply --update-prices
```

The first command is a preview. The second writes allowances while retaining existing paid prices. The third also updates prices to the documented defaults. Applying either writes a backup under ignored `storage/credit-design-*.json` and does not reset or delete usage.

The credit, chat, quota, registry and multimodal test suites cover cost rounding, premium prices, cache writes, total fallback budgets, missing image pricing, stale client quotes, rejected reservations and bounded provider output options. Browser tests cover visible task prices, insufficient credits via both Send and Enter, request price ceilings, and the mobile Usage explanation.
