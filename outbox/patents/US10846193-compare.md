# US10846193 -- FIELD comparison

**Title:** Method and system for real-user capable detecting of the visual completeness of browser rendering process
**Grant date:** 2020-11-24
**Assignee:** Dynatrace LLC
**Total claims:** 33  
**Independent claims:** 3 (1, 18, 26)

> **Auto-generated heuristic analysis. ATTORNEY REVIEW REQUIRED.**  
> Each row matches the claim element text against FIELD architectural  
> features in `.github/field-features.yml`. Verdicts are starting  
> points for the attorney conversation, not legal conclusions.

## Strongest non-infringement arguments (auto-detected)

- **1.g**: sending the data transfer record by the browser agent over a network to a monitoring node, where the monitoring node resides on a server computer a...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **18.g**: sends the data transfer record over a network to a monitoring node, where the monitoring node resides on a server computer and the server computer ...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **26.d**: in response to detecting the end of content processing, computing a performance index and sending the performance index in a data transfer record b...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.

## Likely differentiators (medium confidence)

- **1.a** (ELEMENT_DIFFERS): receiving, by a browser agent, a given notification pertaining to a document object model for the content rendered by the web browser, where the br...  
  -> FIELD's CLS measurement code is part of the application itself, not "injected" into pages by a third-party monitoring vendor. No agent injection mechanism, no instrumented web server.
- **1.c** (ELEMENT_DIFFERS): detecting, by the browser agent, end of content processing by the web browser  
  -> FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reached. PM-26-J was the architectural pivot specifically because cold-load metrics don't capture this.
- **1.d** (ELEMENT_DIFFERS): in response to detecting the end of content processing, creating an update event for each of the one or more changes in a data transfer record by d...  
  -> FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reached. PM-26-J was the architectural pivot specifically because cold-load metrics don't capture this.
- **18.b** (ELEMENT_DIFFERS): a browser agent injected in the content displayed by the web browser and executed by the processor of the computing device, where the browser agent...  
  -> FIELD's CLS measurement code is part of the application itself, not "injected" into pages by a third-party monitoring vendor. No agent injection mechanism, no instrumented web server.
- **18.c** (ELEMENT_DIFFERS): an end-of-content detector configured to detect end of content processing by the web browser  
  -> FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reached. PM-26-J was the architectural pivot specifically because cold-load metrics don't capture this.
- **18.d** (ELEMENT_DIFFERS): a data analyzer, in response to detecting the end of content processing, creates an update event for each of the one or more changes in a data tran...  
  -> FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reached. PM-26-J was the architectural pivot specifically because cold-load metrics don't capture this.
- **26.a** (ELEMENT_DIFFERS): receiving, by a browser agent, a given notification pertaining to a document object model for the content rendered by the web browser, where the br...  
  -> FIELD's CLS measurement code is part of the application itself, not "injected" into pages by a third-party monitoring vendor. No agent injection mechanism, no instrumented web server.
- **26.c** (ELEMENT_DIFFERS): detecting, by the browser agent, end of content processing by the web browser  
  -> FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reached. PM-26-J was the architectural pivot specifically because cold-load metrics don't capture this.

## Elements needing human review (12)

Elements where no FIELD-feature rule matched. Add new rules to `.github/field-features.yml` if patterns emerge:

- **preamble**: A computer-implemented method for monitoring rendering of content by a web browser residing on a computing device, comprising
- **1.b**: in response to receiving the given notification, processing the given notification by the browser agent, where the processing of the given notifica...
- **preamble**: A system for monitoring content rendered by a web browser residing on a computing device, comprising
- **18.a**: a processor in the computing device
- **preamble**: A computer-implemented method for monitoring rendering of content by a web browser residing on a computing device, comprising
- **26.b**: in response to receiving the given notification, processing the given notification by the browser agent, where the processing of the given notifica...
- **26.e**: wherein computing the performance index includes sorting chronologically the update events, where each update record specifies position and size of...
- **26.f**: determining a percentage of a visible content area having content that is rendered by the web browser at different time increments during rendering...
- **26.g**: determining a function that represents the time series
- **26.h**: computing a mathematical integral of the function from a start of the rendering process to an end of the rendering process
- ... and 2 more (see table below)

## Attorney conversation prompts

1. Are the auto-detected NON_INFRINGEMENT elements present in EVERY independent claim, or only some? (Critical for full-claim avoidance.)
2. Could the patent holder argue claim construction broadening to capture FIELD's architecture? (e.g., 'monitoring node' read broadly.)
3. What dependent claims would survive even if the independent claims are avoided? (Independent != only relevant.)
4. Does the patent file history (prosecution) show the applicant explicitly disclaiming what FIELD does?

## Claim 1 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 1.preamble | A computer-implemented method for monitoring rendering of content by a web browser residing on a computing device, comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.a | receiving, by a browser agent, a given notification pertaining to a document object model for the content rendered by the web browser, where the browser agent is injected into the content displayed... | ELEMENT_DIFFERS | MEDIUM | FIELD's CLS measurement code is part of the application itself, not "injected" into pages by a third-party monitoring vendor. No agent injection me... |
| 1.b | in response to receiving the given notification, processing the given notification by the browser agent, where the processing of the given notification includes determining current time, extracting... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.c | detecting, by the browser agent, end of content processing by the web browser | ELEMENT_DIFFERS | HIGH | FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reac... |
| 1.d | in response to detecting the end of content processing, creating an update event for each of the one or more changes in a data transfer record by determining a visible content area of the web browser | ELEMENT_DIFFERS | HIGH | FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reac... |
| 1.e | determining position and size of a display area corresponding to a given change to the document object model and determining whether the display area intersects with the visible content area of the... | MATCH | HIGH | FIELD uses getBoundingClientRect for geometric measurement and computes intersection with the visible viewport. |
| 1.f | creating the update event in the data transfer record only in response to the display area intersecting with the visible content area of the web browser, wherein each update event record specifies ... | MATCH | HIGH | FIELD uses getBoundingClientRect for geometric measurement and computes intersection with the visible viewport. |
| 1.g | sending the data transfer record by the browser agent over a network to a monitoring node, where the monitoring node resides on a server computer and the server computer is located remotely from th... | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |

## Claim 18 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 18.preamble | A system for monitoring content rendered by a web browser residing on a computing device, comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 18.a | a processor in the computing device | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 18.b | a browser agent injected in the content displayed by the web browser and executed by the processor of the computing device, where the browser agent includes: a DOM processor configured to receive a... | ELEMENT_DIFFERS | MEDIUM | FIELD's CLS measurement code is part of the application itself, not "injected" into pages by a third-party monitoring vendor. No agent injection me... |
| 18.c | an end-of-content detector configured to detect end of content processing by the web browser | ELEMENT_DIFFERS | HIGH | FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reac... |
| 18.d | a data analyzer, in response to detecting the end of content processing, creates an update event for each of the one or more changes in a data transfer record by determining a visible content area ... | ELEMENT_DIFFERS | HIGH | FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reac... |
| 18.e | determining position and size of a display area corresponding to a given change to the document object model and determining whether the display area intersects with the visible content area of the... | MATCH | HIGH | FIELD uses getBoundingClientRect for geometric measurement and computes intersection with the visible viewport. |
| 18.f | creating the update event in the data transfer record only in response to the display area intersecting with the visible content area of the web browser, wherein each update event record specifies ... | MATCH | HIGH | FIELD uses getBoundingClientRect for geometric measurement and computes intersection with the visible viewport. |
| 18.g | sends the data transfer record over a network to a monitoring node, where the monitoring node resides on a server computer and the server computer is located remotely from the computing device | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |

## Claim 26 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 26.preamble | A computer-implemented method for monitoring rendering of content by a web browser residing on a computing device, comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 26.a | receiving, by a browser agent, a given notification pertaining to a document object model for the content rendered by the web browser, where the browser agent is injected into the content displayed... | ELEMENT_DIFFERS | MEDIUM | FIELD's CLS measurement code is part of the application itself, not "injected" into pages by a third-party monitoring vendor. No agent injection me... |
| 26.b | in response to receiving the given notification, processing the given notification by the browser agent, where the processing of the given notification includes determining current time, extracting... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 26.c | detecting, by the browser agent, end of content processing by the web browser | ELEMENT_DIFFERS | HIGH | FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reac... |
| 26.d | in response to detecting the end of content processing, computing a performance index and sending the performance index in a data transfer record by the browser agent over a network to a monitoring... | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 26.e | wherein computing the performance index includes sorting chronologically the update events, where each update record specifies position and size of a display area affected by corresponding change t... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 26.f | determining a percentage of a visible content area having content that is rendered by the web browser at different time increments during rendering of content, where the percentage is based on the ... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 26.g | determining a function that represents the time series | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 26.h | computing a mathematical integral of the function from a start of the rendering process to an end of the rendering process | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 26.i | computing a value for overall area by multiplying the visible content area by a duration of the rendering process | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 26.j | setting the performance index equal to difference between the value for the overall area and the mathematical integral | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |

