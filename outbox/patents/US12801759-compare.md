# US12801759 -- FIELD comparison

**Title:** Method and system for data flow monitoring to identify application security vulnerabilities and to detect and prevent attacks
**Grant date:** 2026-11-17
**Assignee:** Dynatrace LLC
**Total claims:** 14  
**Independent claims:** 2 (1, 13)

> **Auto-generated heuristic analysis. ATTORNEY REVIEW REQUIRED.**  
> Each row matches the claim element text against FIELD architectural  
> features in `.github/field-features.yml`. Verdicts are starting  
> points for the attorney conversation, not legal conclusions.

## Strongest non-infringement arguments (auto-detected)

- **1.d**: reporting, by the first agent, first observation data to a monitoring server, where first observation data includes an indicator of the sanitizatio...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.
- **13.d**: wherein the first agent is implemented by computer program instructions executed by a processor of the host computing device and reports first obse...  
  -> FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data transfer to any backend.

## Elements needing human review (14)

Elements where no FIELD-feature rule matched. Add new rules to `.github/field-features.yml` if patterns emerge:

- **preamble**: A computer-implemented method for identifying a security vulnerability in an application executing across processes on a host computing device in a...
- **1.a**: reporting, by a source sensor, input data received by a frontend portion of the application to a first agent, where the input data is received from...
- **1.b**: reporting, by a sanitization sensor, sanitization of the input data to the first agent, where the reporting of the sanitization is in response to e...
- **1.c**: reporting, by a first communication sensor, usage of the input data to the first agent by an outgoing communication method, where the first communi...
- **1.e**: reporting, by a second communication sensor, receipt of the input data by a backend portion of the application to a second agent, where the backend...
- **1.f**: reporting, by a sink sensor, a sink call made by the backend portion of the application to the second agent, where the reporting of the sink call i...
- **1.g**: determining, by the second agent, whether parameter values for the sink call were sanitized and identifying a security vulnerability in the backend...
- **preamble**: A computer-implemented system for identifying a security vulnerability in an application executing across processes on a host computing device in a...
- **13.a**: a source sensor instrumented in a request handling method of a frontend portion of the application and configured to report input data received by ...
- **13.b**: a sanitization sensor instrumented in a data sanitization method within the frontend portion of the application and configured to report sanitizati...
- ... and 4 more (see table below)

## Attorney conversation prompts

1. Are the auto-detected NON_INFRINGEMENT elements present in EVERY independent claim, or only some? (Critical for full-claim avoidance.)
2. Could the patent holder argue claim construction broadening to capture FIELD's architecture? (e.g., 'monitoring node' read broadly.)
3. What dependent claims would survive even if the independent claims are avoided? (Independent != only relevant.)
4. Does the patent file history (prosecution) show the applicant explicitly disclaiming what FIELD does?

## Claim 1 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 1.preamble | A computer-implemented method for identifying a security vulnerability in an application executing across processes on a host computing device in a distributed computing environment, comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.a | reporting, by a source sensor, input data received by a frontend portion of the application to a first agent, where the input data is received from a source external to the host computing device, t... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.b | reporting, by a sanitization sensor, sanitization of the input data to the first agent, where the reporting of the sanitization is in response to execution of a data sanitization method within the ... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.c | reporting, by a first communication sensor, usage of the input data to the first agent by an outgoing communication method, where the first communication sensor is instrumented in the outgoing comm... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.d | reporting, by the first agent, first observation data to a monitoring server, where first observation data includes an indicator of the sanitization of the input data and usage of the input data by... | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 1.e | reporting, by a second communication sensor, receipt of the input data by a backend portion of the application to a second agent, where the backend portion of the application and the second agent a... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.f | reporting, by a sink sensor, a sink call made by the backend portion of the application to the second agent, where the reporting of the sink call is in response to execution of the sink call and th... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.g | determining, by the second agent, whether parameter values for the sink call were sanitized and identifying a security vulnerability in the backend portion of the application in response to a deter... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |

## Claim 13 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 13.preamble | A computer-implemented system for identifying a security vulnerability in an application executing across processes on a host computing device in a distributed computing environment, comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 13.a | a source sensor instrumented in a request handling method of a frontend portion of the application and configured to report input data received by the frontend portion of the application to a first... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 13.b | a sanitization sensor instrumented in a data sanitization method within the frontend portion of the application and configured to report sanitization of the input data to the first agent | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 13.c | a first communication sensor is instrumented in an outgoing communication method and configured to report usage of the input data by the outgoing communication method to the first agent | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 13.d | wherein the first agent is implemented by computer program instructions executed by a processor of the host computing device and reports first observation data to a monitoring server, where first o... | NON_INFRINGEMENT | HIGH | FIELD runs entirely client-side. PM-26-O measures CLS in-browser and exposes the result via ?clsdebug=1 panel. No remote monitoring server. No data... |
| 13.e | a second communication sensor configured to report receipt of the input data by a backend portion of the application to a second agent, where the backend portion of the application and the second a... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 13.f | a sink sensor configured to report a sink call made by the backend portion of the application to the second agent, where the reporting of the sink call is in response to execution of the sink call ... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 13.g | wherein the second agent determines whether parameter values for the sink call were sanitized and identifies a security vulnerability in the backend portion of the application in response to a dete... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |

