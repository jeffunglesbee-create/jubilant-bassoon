# US8335848 -- FIELD comparison

**Title:** Method and apparatus for monitoring and synchronizing user interface events with network data
**Grant date:** 2012-12-18
**Assignee:** TeaLeaf Technology, Inc.
**Total claims:** 23  
**Independent claims:** 4 (1, 8, 16, 20)

> **Auto-generated heuristic analysis. ATTORNEY REVIEW REQUIRED.**  
> Each row matches the claim element text against FIELD architectural  
> features in `.github/field-features.yml`. Verdicts are starting  
> points for the attorney conversation, not legal conclusions.

## Strongest non-infringement arguments (auto-detected)

- **1.a**: capturing network data for a network session at a network location, the network data including web page data transmitted over a network between a w...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **8.a**: a processing device configured to: receive network data for a web session, wherein at least some of the network data comprises web pages transferre...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **16.a**: a first computing device configured to capture network data for a web session, wherein the network data is sent over a network from a web server to...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **20.a**: receiving network data captured while being transmitted over a network during a network session  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.

## Elements needing human review (12)

Elements where no FIELD-feature rule matched. Add new rules to `.github/field-features.yml` if patterns emerge:

- **preamble**: A method, comprising
- **1.b**: separately capturing user interface events associated with the network session at the user device, the user interface events including user inputs ...
- **1.c**: replaying the network session by synchronizing rendering of at least some of the web page data with replay of at least some of the user interface e...
- **preamble**: An apparatus, comprising
- **8.b**: receive input events for the web session, wherein at least some of the input events are captured at a client location and interact with the web pag...
- **8.c**: virtually recreate a re-rendering of the web session, wherein the input events are captured and replayed with the network data to recreate and simu...
- **preamble**: A network monitoring system, comprising
- **16.b**: a second computing device configured to capture user interface events for the web session at the client, wherein at least some of the user interfac...
- **16.c**: a third computing device configured to replay the web session by synchronizing replay of at least some of the user interface events with replay of ...
- **preamble**: A method, comprising
- ... and 2 more (see table below)

## Attorney conversation prompts

1. Are the auto-detected NON_INFRINGEMENT elements present in EVERY independent claim, or only some? (Critical for full-claim avoidance.)
2. Could the patent holder argue claim construction broadening to capture FIELD's architecture? (e.g., 'monitoring node' read broadly.)
3. What dependent claims would survive even if the independent claims are avoided? (Independent != only relevant.)
4. Does the patent file history (prosecution) show the applicant explicitly disclaiming what FIELD does?

## Claim 1 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 1.preamble | A method, comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.a | capturing network data for a network session at a network location, the network data including web page data transmitted over a network between a web server and a user device | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 1.b | separately capturing user interface events associated with the network session at the user device, the user interface events including user inputs for interacting with the web page data | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.c | replaying the network session by synchronizing rendering of at least some of the web page data with replay of at least some of the user interface events in substantially a same order as previously ... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |

## Claim 8 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 8.preamble | An apparatus, comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 8.a | a processing device configured to: receive network data for a web session, wherein at least some of the network data comprises web pages transferred over a network between a server and a client dur... | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 8.b | receive input events for the web session, wherein at least some of the input events are captured at a client location and interact with the web pages during the web session | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 8.c | virtually recreate a re-rendering of the web session, wherein the input events are captured and replayed with the network data to recreate and simulate events previously occurring in the web sessio... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |

## Claim 16 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 16.preamble | A network monitoring system, comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 16.a | a first computing device configured to capture network data for a web session, wherein the network data is sent over a network from a web server to a client during the web session | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 16.b | a second computing device configured to capture user interface events for the web session at the client, wherein at least some of the user interface events interact with the network data | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 16.c | a third computing device configured to replay the web session by synchronizing replay of at least some of the user interface events with replay of at least some of the network data, wherein the use... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |

## Claim 20 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 20.preamble | A method, comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 20.a | receiving network data captured while being transmitted over a network during a network session | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 20.b | receiving user inputs captured during the network session, wherein the user inputs are entered in response web pages in the network data displayed during the network session | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 20.c | replaying the network session by synchronizing rendering of the web pages in the network data with the replaying of the user inputs, wherein the user inputs are captured and replayed with the netwo... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |

