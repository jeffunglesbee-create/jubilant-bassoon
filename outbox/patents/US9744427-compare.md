# US9744427 -- FIELD comparison

**Title:** Rating system for identifying exciting sporting events and notifying users
**Grant date:** 2017-08-29
**Assignee:** (unknown)
**Total claims:** 19  
**Independent claims:** 3 (1, 10, 11)

> **Auto-generated heuristic analysis. ATTORNEY REVIEW REQUIRED.**  
> Each row matches the claim element text against FIELD architectural  
> features in `.github/field-features.yml`. Verdicts are starting  
> points for the attorney conversation, not legal conclusions.

## Strongest non-infringement arguments (auto-detected)

- **1.b**: a notification engine coupled to the rating engine, wherein in response to the rating engine determining that the rating associated with the sporti...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **10.c**: wherein the notification engine is coupled to the rating engine and configured to transmit notifications to user devices of one or more users in re...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **10.e**: wherein the notification engine is configured to transmit notifications in the form of programming instructions that are transmitted to a recording...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **11.d**: the sporting event rating and notification system transmitting notifications to user devices of a first set of one or more users when the rating as...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.

## Elements needing human review (10)

Elements where no FIELD-feature rule matched. Add new rules to `.github/field-features.yml` if patterns emerge:

- **preamble**: A sporting event rating and notification system comprising
- **1.a**: a rating engine, wherein the rating engine monitors one or more feeds from one or more external data sources, wherein the feeds contain game statis...
- **preamble**: A sporting event rating and notification system comprising
- **10.a**: a rating engine and a notification engine
- **10.b**: wherein the rating engine is configured to monitor one or more feeds from one or more external data sources, wherein the feeds contain game statist...
- **10.d**: wherein the game statistics associated with the sporting event are received by the rating engine prior to completion of the sporting event and the ...
- **preamble**: A method implemented in a sporting event rating and notification system, the method comprising
- **11.a**: the sporting event rating and notification system monitoring one or more feeds from one or more external data sources, wherein the feeds contain ga...
- **11.b**: the sporting event rating and notification system determining a rating associated with the sporting event based on the received game statistics
- **11.c**: the sporting event rating and notification system determining whether the rating meets one or more threshold levels

## Attorney conversation prompts

1. Are the auto-detected NON_INFRINGEMENT elements present in EVERY independent claim, or only some? (Critical for full-claim avoidance.)
2. Could the patent holder argue claim construction broadening to capture FIELD's architecture? (e.g., 'monitoring node' read broadly.)
3. What dependent claims would survive even if the independent claims are avoided? (Independent != only relevant.)
4. Does the patent file history (prosecution) show the applicant explicitly disclaiming what FIELD does?

## Claim 1 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 1.preamble | A sporting event rating and notification system comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.a | a rating engine, wherein the rating engine monitors one or more feeds from one or more external data sources, wherein the feeds contain game statistics describing a sporting event, wherein the rati... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.b | a notification engine coupled to the rating engine, wherein in response to the rating engine determining that the rating associated with the sporting event meets each of the one or more threshold l... | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |

## Claim 10 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 10.preamble | A sporting event rating and notification system comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 10.a | a rating engine and a notification engine | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 10.b | wherein the rating engine is configured to monitor one or more feeds from one or more external data sources, wherein the feeds contain game statistics describing a sporting event, determine a ratin... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 10.c | wherein the notification engine is coupled to the rating engine and configured to transmit notifications to user devices of one or more users in response to the rating engine determining that the r... | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 10.d | wherein the game statistics associated with the sporting event are received by the rating engine prior to completion of the sporting event and the notifications are transmitted to the user devices ... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 10.e | wherein the notification engine is configured to transmit notifications in the form of programming instructions that are transmitted to a recording device, wherein the programming instructions are ... | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |

## Claim 11 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 11.preamble | A method implemented in a sporting event rating and notification system, the method comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 11.a | the sporting event rating and notification system monitoring one or more feeds from one or more external data sources, wherein the feeds contain game statistics describing a sporting event | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 11.b | the sporting event rating and notification system determining a rating associated with the sporting event based on the received game statistics | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 11.c | the sporting event rating and notification system determining whether the rating meets one or more threshold levels | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 11.d | the sporting event rating and notification system transmitting notifications to user devices of a first set of one or more users when the rating associated with the sporting event reaches the one o... | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |

