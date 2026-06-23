# FIELD — Email Distribution Layer Spec
# Night Owl: Resend (testing) → Beehiiv (production)

**Date:** 2026-06-23
**Status:** STAGED — do not build until Levels 1-5 ship on Resend
**Depends on:** Night Owl email Levels 1-5 complete and stable

---

## WHY THIS EXISTS SEPARATELY

Levels 1-5 of the email brief upgrade run on Resend single-recipient.
Resend is the right testing layer — fast iteration, one recipient, zero
audience risk. Distribution is a separate concern from content quality.
Do not attempt Beehiiv migration until the email is stable across
multiple nightly sends with Level 1-5 content verified.

---

## THE PROBLEM WITH RESEND AT SCALE

Current Resend config: `from: 'FIELD <onboarding@resend.dev>'`

1. **Spam risk:** `onboarding@resend.dev` is Resend's sandbox domain,
   shared with every new Resend account. Some spam filters flag it.
   Recipients never see a verified FIELD domain.

2. **Single recipient:** Hardcoded to `jeffunglesbee@gmail.com`.
   No subscriber management, no sign-up form, no audience.

3. **No analytics:** Resend logs sends but provides no open rates,
   click-through rates, or engagement data.

4. **Free tier cap:** 100 emails/day. Acceptable for testing.
   Breaks at 101 subscribers.

5. **No archive:** Each email is one-time delivery. No newsletter URL,
   no past-issue browsing, no web presence for the Night Owl.

---

## BEEHIIV MIGRATION SPEC

### Platform choice rationale (confirmed prior session, May 29 2026)

Free Launch plan: 2,500 subscribers, unlimited sends.
Includes: landing page, subscriber sign-up form, basic analytics,
newsletter hosting, archive URLs.
No credit card required. Path to ad network at ~500+ subscribers.

### Migration steps

**Step 1 — Beehiiv account setup (one-time, manual)**
- Create account at beehiiv.com
- Publication name: FIELD Night Owl
- Custom domain: [TBD — requires domain DNS config]
- Verify sender domain → replaces `onboarding@resend.dev`
- Generate Beehiiv API key

**Step 2 — GitHub secret**
Add `BEEHIIV_API_KEY` and `BEEHIIV_PUBLICATION_ID` to jubilant-bassoon
GitHub Actions secrets. Same pattern as `RESEND_API_KEY`.

**Step 3 — Swap sender in night-owl-email.js**

Replace Resend `sendEmail()` function with Beehiiv `sendEmail()`:

```javascript
// Beehiiv send — replaces Resend sender
async function sendEmail({ subject, htmlBody }) {
  const body = JSON.stringify({
    subject,
    content: {
      free: htmlBody,       // full content for free subscribers
    },
    send_at: 'now',
    email_address: null,    // null = send to all subscribers
  });

  const res = await fetch(
    `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/broadcasts`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body,
    }
  );

  if (!res.ok) throw new Error(`Beehiiv ${res.status}: ${await res.text()}`);
  return res.json();
}
```

**Step 4 — Subscriber sign-up on FIELD app**

Add a "Get Night Owl →" entry point to the FIELD PWA:
- Small chip or footer link on the FIELD app
- Opens Beehiiv's hosted sign-up page (or embedded form)
- One line of HTML, no JS required

**Step 5 — Archive link in email footer**

Replace current footer with:
```html
<div>FIELD Night Owl · <a href="[beehiiv-archive-url]">Past issues</a></div>
```

### Env var changes

Remove:  RESEND_API_KEY
Add:     BEEHIIV_API_KEY
Add:     BEEHIIV_PUBLICATION_ID

Keep both in transition period — gate on env var presence:

```javascript
const USE_BEEHIIV = !!process.env.BEEHIIV_API_KEY;
if (USE_BEEHIIV) {
  await sendBeehiiv({ subject, htmlBody });
} else {
  await sendResend({ to: FIELD_EMAIL, subject, html: htmlBody });
}
```

### No content changes at migration time

The Beehiiv migration is infrastructure-only. Content (Levels 1-5)
ships on Resend first, stabilizes, then migrates. Never change content
and infrastructure in the same commit.

---

## ANALYTICS TARGETS (post-migration)

Track via Beehiiv dashboard:
- Open rate target: >40% (sports email benchmark: 35-40%)
- Click-through on "Open FIELD →": >8%
- Subscriber growth: organic via FIELD app sign-up chip

---

## LONG-TERM (>500 subscribers)

Beehiiv ad network becomes available. Night Owl becomes self-sustaining.
Monetization path documented separately if subscriber target is reached.

---

## REFERENCES

- May 29 2026 session: Beehiiv vs Resend analysis
- night-owl-email.yml: .github/workflows/night-owl-email.yml
- night-owl-email.js: scripts/night-owl-email.js
- Email Level 1-5 spec: [this session, June 23 2026]
