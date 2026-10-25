# Dana IVR marketing demo audio

- Preferred static file: `rsvp-calls-dana-demo.mp3` (commit after controlled publish).
- Runtime fallback: `/api/marketing/rsvp-calls-demo` caches the same file in R2 under
  `marketing/rsvp-calls-dana-demo.mp3` using locked Dana (`V0stpogHp8KBgdErUZbd`),
  `eleven_v3` + Hebrew, and `composeIvrIntroAudio` — identical to live outbound IVR.

Generate locally (requires `ELEVENLABS_API_KEY`):

```bash
npm run generate:rsvp-calls-demo
# or force rebuild:
FORCE_RSVP_CALLS_DEMO_AUDIO=1 npm run generate:rsvp-calls-demo
```
