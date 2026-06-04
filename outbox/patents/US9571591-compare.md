# US9571591 -- FIELD comparison

**Title:** Method and system for tracing end-to-end transaction which accounts for content update requests
**Grant date:** 2017-02-14
**Assignee:** Dynatrace LLC
**Total claims:** 31  
**Independent claims:** 3 (1, 19, 31)

> **Auto-generated heuristic analysis. ATTORNEY REVIEW REQUIRED.**  
> Each row matches the claim element text against FIELD architectural  
> features in `.github/field-features.yml`. Verdicts are starting  
> points for the attorney conversation, not legal conclusions.

## Strongest non-infringement arguments (auto-detected)

- **1.d**: detecting, by the browser agent, update mechanisms in the web content that send content update requests to a server which is located remotely from ...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **1.j**: sending, by the browser agent, the action record over a data network to a monitoring node located remotely from the computing device  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **19.c**: the instrumentation section further detects update mechanisms that send content update requests to a web server and instruments each of the detecte...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **19.f**: a correlation data manager configured to receive the first action event from the action data manager and operates to update correlation data with a...  
  -> FIELD has no concept of "transaction execution" tying user interactions to server-side processing. No end-to-end trace. No correlation IDs sent anywhere.
- **19.g**: a request handling method configured, at a web server, to receive a request from the web browser, create a request record for the request and send ...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **31.c**: the instrumentation section further detects update mechanisms that send content update requests to the web server and instruments each of the detec...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **31.f**: a request handling method configured, at a web server, to receive a request for the new content from the web browser, create a request record for t...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.

## Likely differentiators (medium confidence)

- **1.a** (ELEMENT_DIFFERS): instrumenting a request handling method with a request handling sensor, the request handling sensor operating to inject a browser agent into the we...  
  -> FIELD's CLS measurement code is part of the application itself, not "injected" into pages by a third-party monitoring vendor. No agent injection mechanism, no instrumented web server.
- **19.b** (ELEMENT_DIFFERS): a browser agent executing on the client computing device and being injected into the web content by a request sensor and further comprises: an inst...  
  -> FIELD's CLS measurement code is part of the application itself, not "injected" into pages by a third-party monitoring vendor. No agent injection mechanism, no instrumented web server.
- **31.b** (ELEMENT_DIFFERS): a browser agent executing on the client computing device and being injected into the web content by a request sensor and further includes: an instr...  
  -> FIELD's CLS measurement code is part of the application itself, not "injected" into pages by a third-party monitoring vendor. No agent injection mechanism, no instrumented web server.

## Elements needing human review (18)

Elements where no FIELD-feature rule matched. Add new rules to `.github/field-features.yml` if patterns emerge:

- **preamble**: A computer-implemented method for determining a performance metric of a web browser displaying web content and executing on a computing device, com...
- **1.b**: detecting, by the browser agent, user input elements in the web content displayed by the web browser
- **1.c**: instrumenting, by the browser agent, each detected user input elements, where the user input elements were not previously instrumented and the acti...
- **1.e**: instrumenting, by the browser agent, each of the detected update mechanisms with an action sensor, where the detected update mechanisms were not pr...
- **1.f**: capturing a first action event at the browser agent which is executing on the client computing device, where the first action event is indicative o...
- **1.g**: capturing a second action event at the browser agent, where the second action event is caused by the first action and is indicative of a content up...
- **1.h**: associating, by the browser agent, the second action event with the first action event
- **1.i**: creating, by the browser agent, an action record for the user interaction, where the action record includes an identifier for the user interaction ...
- **preamble**: A performance management system that measure end user performance in a distributed computing environment, comprising
- **19.a**: a web browser displaying web content and executing on a client computing device
- ... and 8 more (see table below)

## Attorney conversation prompts

1. Are the auto-detected NON_INFRINGEMENT elements present in EVERY independent claim, or only some? (Critical for full-claim avoidance.)
2. Could the patent holder argue claim construction broadening to capture FIELD's architecture? (e.g., 'monitoring node' read broadly.)
3. What dependent claims would survive even if the independent claims are avoided? (Independent != only relevant.)
4. Does the patent file history (prosecution) show the applicant explicitly disclaiming what FIELD does?

## Claim 1 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 1.preamble | A computer-implemented method for determining a performance metric of a web browser displaying web content and executing on a computing device, comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.a | instrumenting a request handling method with a request handling sensor, the request handling sensor operating to inject a browser agent into the web content | ELEMENT_DIFFERS | MEDIUM | FIELD's CLS measurement code is part of the application itself, not "injected" into pages by a third-party monitoring vendor. No agent injection me... |
| 1.b | detecting, by the browser agent, user input elements in the web content displayed by the web browser | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.c | instrumenting, by the browser agent, each detected user input elements, where the user input elements were not previously instrumented and the action sensor generates an action event indicative of ... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.d | detecting, by the browser agent, update mechanisms in the web content that send content update requests to a server which is located remotely from the computing device | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 1.e | instrumenting, by the browser agent, each of the detected update mechanisms with an action sensor, where the detected update mechanisms were not previously instrumented and the action sensor genera... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.f | capturing a first action event at the browser agent which is executing on the client computing device, where the first action event is indicative of a user interaction with a user interaction eleme... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.g | capturing a second action event at the browser agent, where the second action event is caused by the first action and is indicative of a content update request sent from the web browser by a script... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.h | associating, by the browser agent, the second action event with the first action event | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.i | creating, by the browser agent, an action record for the user interaction, where the action record includes an identifier for the user interaction and a performance metric that is related to the us... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.j | sending, by the browser agent, the action record over a data network to a monitoring node located remotely from the computing device | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |

## Claim 19 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 19.preamble | A performance management system that measure end user performance in a distributed computing environment, comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 19.a | a web browser displaying web content and executing on a client computing device | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 19.b | a browser agent executing on the client computing device and being injected into the web content by a request sensor and further comprises: an instrumentation section that detects user input elemen... | ELEMENT_DIFFERS | MEDIUM | FIELD's CLS measurement code is part of the application itself, not "injected" into pages by a third-party monitoring vendor. No agent injection me... |
| 19.c | the instrumentation section further detects update mechanisms that send content update requests to a web server and instruments each of the detected update mechanisms with an action sensor, where t... | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 19.d | an action data manager configured to receive a first action event indicative of a user interaction with the web browser, where the first action event is indicative of a user interaction with a user... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 19.e | wherein the action data manager is configured to receive a second action event and associate the second action event with the first action event, where the second action event caused by the first a... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 19.f | a correlation data manager configured to receive the first action event from the action data manager and operates to update correlation data with an identifier for the user interaction, where the c... | ELEMENT_ABSENT | HIGH | FIELD has no concept of "transaction execution" tying user interactions to server-side processing. No end-to-end trace. No correlation IDs sent any... |
| 19.g | a request handling method configured, at a web server, to receive a request from the web browser, create a request record for the request and send the request record over a data network to the moni... | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 19.h | an event correlator executing on the monitor computing device, the event correlator configured to receive the action record and the request record and operate to associate the request record with t... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |

## Claim 31 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 31.preamble | A performance management system that measure end user performance in a distributed computing environment, comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 31.a | a web browser displaying web content and executing on a client computing device | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 31.b | a browser agent executing on the client computing device and being injected into the web content by a request sensor and further includes: an instrumentation section that detects user input element... | ELEMENT_DIFFERS | MEDIUM | FIELD's CLS measurement code is part of the application itself, not "injected" into pages by a third-party monitoring vendor. No agent injection me... |
| 31.c | the instrumentation section further detects update mechanisms that send content update requests to the web server and instruments each of the detected update mechanisms with an action sensor, where... | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 31.d | an action data manager configured to receive an action event indicative of the web browser loading new content, create an action record for the action event and send the action record over a data n... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 31.e | wherein the action data manager is configured to receive a second action event and associate the second action event with the first action event, where the second action event is caused by the firs... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 31.f | a request handling method configured, at a web server, to receive a request for the new content from the web browser, create a request record for the request and send the request record over a data... | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 31.g | an event correlator executing on the monitor computing device, the event correlator configured to receive the action record and the request record and operate to associate the action record with th... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |

