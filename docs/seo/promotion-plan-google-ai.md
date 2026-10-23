# Practical plan — more Google + AI visibility that leads to paying customers

Goal: qualified organic demand → `/pricing` / `/contact` / WhatsApp package CTA.  
Not a ranking guarantee.

## Pillars of work

### 1) Index & measure (week 1 after deploy)

- Connect GSC / GA4 / Bing (`connect-search-analytics.md`).
- Request indexing for hubs (`post-publish-index-checklist.md`).
- Baseline screenshot of GSC Performance empty/partial state.

### 2) Win commercial head terms with existing URLs

Protect one primary per query (Keyword Map). Improve CTR only with factual title/description tweaks after GSC shows impressions.

Priority hubs for conversion:

1. `/rsvp/chatuna`  
2. `/rsvp/whatsapp`  
3. `/pricing`  
4. `/invitations/chatuna`  
5. `/seating-explained`  
6. `/event-management`

### 3) Capture informational demand → route to money pages

Guides already cover cost, timing, non-replies, seating, table number, event-day. Internal links and CTAs stay pointed at `/pricing` + `/contact`.

Do **not** mass-publish thin articles. Add a guide only when GSC shows a distinct query with impressions and no fitting URL.

### 4) Entity & trust

- Complete Google Business + directory profiles (approved).  
- Collect **real** reviews.  
- Keep Organization schema NAP identical to footer/contact/terms.  
- Add `sameAs` only after verified profiles exist.

### 5) AI / answer engines (GEO)

Already shipped:

- Answer-first HTML on hubs  
- `answers.json` + `llms.txt` (explicitly not a ranking factor)  
- FAQ visible in DOM  
- AI referral events when referrer/UTM present  

Operating cadence:

1. Monthly run of `AI_MONITOR_QUESTIONS` across ChatGPT Search, Gemini, Google AI Overview/AI Mode, Perplexity, Copilot.  
2. Log: cited? which URL? accurate?  
3. If misinformation appears, fix the source page facts first — never write “we are the best” bait.

### 6) Off-page that supports paid conversions

Execute from `outreach-targets.md` only with approval. Prefer venue/producer mentions and directory presence over random blogs.

### 7) Conversion loop

Watch in GA4:

- `select_cta` (pricing/contact)  
- `generate_lead` / WhatsApp clicks if tagged  
- `sign_up`  

If a page gets impressions but low CTA rate, fix message clarity — not prices — without redesign.

## 30 / 60 / 90 (post-publish)

See also `plan-30-60-90.md`. Short version:

- **30:** index + analytics + first AI monitor + no technical regressions  
- **60:** GSC query mining → title tests + approved outreach start  
- **90:** compare cohorts; double down on URLs that drive CTAs, prune vanity metrics
