# US8533532 -- FIELD comparison

**Title:** System identifying and inferring web session events
**Grant date:** 2013-09-10
**Assignee:** International Business Machines Corporation
**Total claims:** 30  
**Independent claims:** 5 (1, 10, 19, 20, 26)

> **Auto-generated heuristic analysis. ATTORNEY REVIEW REQUIRED.**  
> Each row matches the claim element text against FIELD architectural  
> features in `.github/field-features.yml`. Verdicts are starting  
> points for the attorney conversation, not legal conclusions.

## Strongest non-infringement arguments (auto-detected)

- **20.b**: a session replay controller configured to replay the logged events  
  -> FIELD does NOT record session replay or transaction trace data. No reconstruction of past states. No "replay" capability.

## Elements needing human review (15)

Elements where no FIELD-feature rule matched. Add new rules to `.github/field-features.yml` if patterns emerge:

- **preamble**: A method comprising
- **1.a**: capturing a first set of events on an instrumented browser for a first web session with a web application
- **1.b**: capturing a second set of events with a capture system operating with a non-instrumented browser for a second web session with the web application
- **1.c**: identifying differences between the first set of events and the second set of events
- **1.d**: using the identified differences to analyze performance of the capture system
- **preamble**: A test system, comprising
- **10.a**: a computer system configured to compare reference events for a first web session with captured events captured by a capture system during a second ...
- **preamble**: The test system according to 10 wherein the computer system is configured to: identify a particular one of the reference events; identify any chang...
- **preamble**: A replay system, comprising
- **20.a**: a replay log configured to log events captured from a monitored client web session
- ... and 5 more (see table below)

## Attorney conversation prompts

1. Are the auto-detected NON_INFRINGEMENT elements present in EVERY independent claim, or only some? (Critical for full-claim avoidance.)
2. Could the patent holder argue claim construction broadening to capture FIELD's architecture? (e.g., 'monitoring node' read broadly.)
3. What dependent claims would survive even if the independent claims are avoided? (Independent != only relevant.)
4. Does the patent file history (prosecution) show the applicant explicitly disclaiming what FIELD does?

## Claim 1 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 1.preamble | A method comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.a | capturing a first set of events on an instrumented browser for a first web session with a web application | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.b | capturing a second set of events with a capture system operating with a non-instrumented browser for a second web session with the web application | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.c | identifying differences between the first set of events and the second set of events | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.d | using the identified differences to analyze performance of the capture system | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |

## Claim 10 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 10.preamble | A test system, comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 10.a | a computer system configured to compare reference events for a first web session with captured events captured by a capture system during a second web session, the computer system further configure... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |

## Claim 19 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 19.preamble | The test system according to 10 wherein the computer system is configured to: identify a particular one of the reference events; identify any changes in a Document Object Model (DOM) state associat... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |

## Claim 20 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 20.preamble | A replay system, comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 20.a | a replay log configured to log events captured from a monitored client web session | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 20.b | a session replay controller configured to replay the logged events | ELEMENT_ABSENT | HIGH | FIELD does NOT record session replay or transaction trace data. No reconstruction of past states. No "replay" capability. |
| 20.c | an inference engine comprising a set of replay rules that correspond with missed events that were not detected during the monitored client web session, the inference engine configured to generate t... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |

## Claim 26 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 26.preamble | An apparatus, comprising | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 26.a | a memory configured to store logged events from a monitored client web session | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 26.b | a computing device configured to: infer events that were missed during the client web session | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 26.c | generate the inferred events when replaying the logged events | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |

