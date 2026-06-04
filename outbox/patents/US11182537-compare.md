# US11182537 -- FIELD comparison

**Title:** Method and system for real-user capable detecting of the visual completeness of browser rendering processes
**Grant date:** 2021-11-23
**Assignee:** Dynatrace LLC
**Total claims:** 15  
**Independent claims:** 3 (1, 9, 15)

> **Auto-generated heuristic analysis. ATTORNEY REVIEW REQUIRED.**  
> Each row matches the claim element text against FIELD architectural  
> features in `.github/field-features.yml`. Verdicts are starting  
> points for the attorney conversation, not legal conclusions.

## Strongest non-infringement arguments (auto-detected)

- **1.h**: sending the data transfer record by the browser agent over a network to a monitoring node, where the monitoring node resides on a server computer a...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **1.i**: rendering, by the monitoring node, the process visualization data on a display associated with the server computer by generating a first document o...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **1.k**: for each mutation entry retrieved from the data transfer record, inversely applying a change described in a given mutation entry to a corresponding...  
  -> FIELD does NOT record session replay or transaction trace data. No reconstruction of past states. No "replay" capability.
- **9.h**: sending the data transfer record by the browser agent over a network to a monitoring node, where the monitoring node resides on a server computer a...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **9.i**: sorting, by the monitoring node, chronologically update events received in the data transfer record, where each update record specifies position an...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **9.j**: determining, by the monitoring node, a percentage of a visible content area having content that is rendered by the web browser at different time in...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **9.k**: determining, by the monitoring node, a function that represents the time series  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **9.l**: computing, by the monitoring node, a mathematical integral of the function from a start of the rendering process to an end of the rendering process  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **9.m**: computing, by the monitoring node, a value for overall area by multiplying the visible content area by a render time  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **9.n**: computing, by the monitoring node, a performance index by subtracting the mathematical integral from the value for the overall area  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **15.h**: sends the data transfer record over a network to a monitoring node, where the monitoring node resides on a server computer and the server computer ...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **15.i**: wherein the monitoring node renders the process visualization data by generating a first document object model from the text representation of the ...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **15.k**: for each mutation entry retrieved from the data transfer record, inversely applying a change described in a given mutation entry to a corresponding...  
  -> FIELD does NOT record session replay or transaction trace data. No reconstruction of past states. No "replay" capability.

## Likely differentiators (medium confidence)

- **1.a** (ELEMENT_DIFFERS): receiving, by a browser agent, a given notification pertaining to a document object model for the content rendered by the web browser, where the br...  
  -> FIELD's CLS measurement code is part of the application itself, not "injected" into pages by a third-party monitoring vendor. No agent injection mechanism, no instrumented web server.
- **1.c** (ELEMENT_DIFFERS): detecting, by the browser agent, end of content processing by the web browser  
  -> FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reached. PM-26-J was the architectural pivot specifically because cold-load metrics don't capture this.
- **1.d** (ELEMENT_DIFFERS): in response to detecting the end of content processing, gathering process visualization data by assigning, by the browser agent, a unique identifie...  
  -> FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reached. PM-26-J was the architectural pivot specifically because cold-load metrics don't capture this.
- **9.a** (ELEMENT_DIFFERS): receiving, by a browser agent, a given notification pertaining to a document object model for the content rendered by the web browser, where the br...  
  -> FIELD's CLS measurement code is part of the application itself, not "injected" into pages by a third-party monitoring vendor. No agent injection mechanism, no instrumented web server.
- **9.c** (ELEMENT_DIFFERS): detecting, by the browser agent, end of content processing by the web browser  
  -> FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reached. PM-26-J was the architectural pivot specifically because cold-load metrics don't capture this.
- **9.d** (ELEMENT_DIFFERS): in response to detecting the end of content processing, gathering process visualization data by assigning, by the browser agent, a unique identifie...  
  -> FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reached. PM-26-J was the architectural pivot specifically because cold-load metrics don't capture this.
- **15.b** (ELEMENT_DIFFERS): a browser agent injected in the content displayed by the web browser and executed by the processor of the computing device, where the browser agent...  
  -> FIELD's CLS measurement code is part of the application itself, not "injected" into pages by a third-party monitoring vendor. No agent injection mechanism, no instrumented web server.
- **15.c** (ELEMENT_DIFFERS): an end-of-content detector configured to detect end of content processing by the web browser  
  -> FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reached. PM-26-J was the architectural pivot specifically because cold-load metrics don't capture this.
- **15.d** (ELEMENT_DIFFERS): a data analyzer, in response to detecting the end of content processing, gathers process visualization data by assigning, by the browser agent, a u...  
  -> FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reached. PM-26-J was the architectural pivot specifically because cold-load metrics don't capture this.

## Elements needing human review (17)

Elements where no FIELD-feature rule matched. Add new rules to `.github/field-features.yml` if patterns emerge:

- **preamble**: A computer-implemented method for monitoring rendering of content by a web browser residing on a computing device, comprising
- **1.b**: in response to receiving the given notification, processing, by the browser agent, the given notification by determining current time, extracting t...
- **1.e**: assigning, by the browser agent, a unique identifier to each mutation entry, where the unique identifier assigned to a given mutation entry is the ...
- **1.f**: capturing, by the browser agent, a text representation of the document object model, where the text representation includes unique identifiers that...
- **1.g**: adding, by the browser agent, the mutation entries and the text representation of the document object model to the data transfer record
- **1.j**: retrieving mutation entries from the data transfer record based on time at which the mutation described by the mutation entry occurred and in order...
- **preamble**: A computer-implemented method for monitoring rendering of content by a web browser residing on a computing device, comprising
- **9.b**: in response to receiving the given notification, processing, by the browser agent, the given notification by determining current time, extracting t...
- **9.e**: assigning, by the browser agent, a unique identifier to each mutation entry, where the unique identifier assigned to a given mutation entry is the ...
- **9.f**: capturing, by the browser agent, a text representation of the content, where the text representation includes unique identifiers for each element o...
- ... and 7 more (see table below)

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
| 1.b | in response to receiving the given notification, processing, by the browser agent, the given notification by determining current time, extracting the one or more changes from the given notification... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.c | detecting, by the browser agent, end of content processing by the web browser | ELEMENT_DIFFERS | HIGH | FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reac... |
| 1.d | in response to detecting the end of content processing, gathering process visualization data by assigning, by the browser agent, a unique identifier to each element of the document object model ide... | ELEMENT_DIFFERS | HIGH | FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reac... |
| 1.e | assigning, by the browser agent, a unique identifier to each mutation entry, where the unique identifier assigned to a given mutation entry is the same unique identifier that was assigned to the el... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.f | capturing, by the browser agent, a text representation of the document object model, where the text representation includes unique identifiers that were assigned by the browser agent to correspondi... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.g | adding, by the browser agent, the mutation entries and the text representation of the document object model to the data transfer record | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.h | sending the data transfer record by the browser agent over a network to a monitoring node, where the monitoring node resides on a server computer and the server computer is located remotely from th... | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 1.i | rendering, by the monitoring node, the process visualization data on a display associated with the server computer by generating a first document object model from the text representation, where ea... | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 1.j | retrieving mutation entries from the data transfer record based on time at which the mutation described by the mutation entry occurred and in order from most recent to oldest | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.k | for each mutation entry retrieved from the data transfer record, inversely applying a change described in a given mutation entry to a corresponding element of the first document object model in par... | ELEMENT_ABSENT | HIGH | FIELD does NOT record session replay or transaction trace data. No reconstruction of past states. No "replay" capability. |

## Claim 9 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 9.preamble | A computer-implemented method for monitoring rendering of content by a web browser residing on a computing device, comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 9.a | receiving, by a browser agent, a given notification pertaining to a document object model for the content rendered by the web browser, where the browser agent is injected into the content displayed... | ELEMENT_DIFFERS | MEDIUM | FIELD's CLS measurement code is part of the application itself, not "injected" into pages by a third-party monitoring vendor. No agent injection me... |
| 9.b | in response to receiving the given notification, processing, by the browser agent, the given notification by determining current time, extracting the one or more changes from the given notification... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 9.c | detecting, by the browser agent, end of content processing by the web browser | ELEMENT_DIFFERS | HIGH | FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reac... |
| 9.d | in response to detecting the end of content processing, gathering process visualization data by assigning, by the browser agent, a unique identifier to each element of the document object model ide... | ELEMENT_DIFFERS | HIGH | FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reac... |
| 9.e | assigning, by the browser agent, a unique identifier to each mutation entry, where the unique identifier assigned to a given mutation entry is the same unique identifier that was assigned to the el... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 9.f | capturing, by the browser agent, a text representation of the content, where the text representation includes unique identifiers for each element of the document object model | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 9.g | adding, by the browser agent, the mutation entries and the text representation of the content to the data transfer record | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 9.h | sending the data transfer record by the browser agent over a network to a monitoring node, where the monitoring node resides on a server computer and the server computer is located remotely from th... | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 9.i | sorting, by the monitoring node, chronologically update events received in the data transfer record, where each update record specifies position and size of the display area affected by correspondi... | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 9.j | determining, by the monitoring node, a percentage of a visible content area having content that is rendered by the web browser at different time increments during rendering of content, where the pe... | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 9.k | determining, by the monitoring node, a function that represents the time series | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 9.l | computing, by the monitoring node, a mathematical integral of the function from a start of the rendering process to an end of the rendering process | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 9.m | computing, by the monitoring node, a value for overall area by multiplying the visible content area by a render time | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 9.n | computing, by the monitoring node, a performance index by subtracting the mathematical integral from the value for the overall area | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |

## Claim 15 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 15.preamble | A system for monitoring content rendered by a web browser residing on a computing device, comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 15.a | a processor in the computing device | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 15.b | a browser agent injected in the content displayed by the web browser and executed by the processor of the computing device, where the browser agent includes: a DOM processor configured to receive a... | ELEMENT_DIFFERS | MEDIUM | FIELD's CLS measurement code is part of the application itself, not "injected" into pages by a third-party monitoring vendor. No agent injection me... |
| 15.c | an end-of-content detector configured to detect end of content processing by the web browser | ELEMENT_DIFFERS | HIGH | FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reac... |
| 15.d | a data analyzer, in response to detecting the end of content processing, gathers process visualization data by assigning, by the browser agent, a unique identifier to each element of the document o... | ELEMENT_DIFFERS | HIGH | FIELD has continuous editorial mutations on a ~30s ESPN polling cycle. The "end of content processing" state defined by these patents is NEVER reac... |
| 15.e | assigning, by the browser agent, a unique identifier to each mutation entry, where the unique identifier assigned to a given mutation entry is the same unique identifier that was assigned to the el... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 15.f | capturing, by the browser agent, a text representation of the document object model, where the text representation includes unique identifiers for each element of the document object model | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 15.g | adding, by the browser agent, the mutation entries and the text representation of the document object model to the data transfer record | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 15.h | sends the data transfer record over a network to a monitoring node, where the monitoring node resides on a server computer and the server computer is located remotely from the computing device | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 15.i | wherein the monitoring node renders the process visualization data by generating a first document object model from the text representation of the content, where each element of the first document ... | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 15.j | retrieving mutation entries from the data transfer record based on time at which the mutation described by the mutation entry occurred and in order from most recent to oldest | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 15.k | for each mutation entry retrieved from the data transfer record, inversely applying a change described in a given mutation entry to a corresponding element of the first document object model in par... | ELEMENT_ABSENT | HIGH | FIELD does NOT record session replay or transaction trace data. No reconstruction of past states. No "replay" capability. |

