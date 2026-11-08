# US12786287 -- FIELD comparison

**Title:** Content delivery network (CDN) cold content handling
**Grant date:** 2026-11-03
**Assignee:** Akamai Technologies, Inc.
**Total claims:** 10  
**Independent claims:** 1 (1)

> **Auto-generated heuristic analysis. ATTORNEY REVIEW REQUIRED.**  
> Each row matches the claim element text against FIELD architectural  
> features in `.github/field-features.yml`. Verdicts are starting  
> points for the attorney conversation, not legal conclusions.

## Strongest non-infringement arguments (auto-detected)

None auto-detected. Manual review required.

## Elements needing human review (6)

Elements where no FIELD-feature rule matched. Add new rules to `.github/field-features.yml` if patterns emerge:

- **preamble**: A method of content handling in an edge region of a content delivery network, the edge region comprising a set of peer machines, wherein each peer ...
- **1.a**: receiving a request at a first one of the peer machines, the request having associated therewith a hostname having a value that points to peer mach...
- **1.b**: in response to receiving the request, hashing the cache key that includes the value to create a hashed value that also points to one or more other ...
- **1.c**: based on the hashed value, forwarding the request to at least one other peer machine pointed to by the hashed value
- **1.d**: at the other peer machine, using the hashed value as a cache key for responding to the request
- **1.e**: wherein hashing of the cache key and forwarding of the request facilitate spreading of the set of requests associated with the hostname across the ...

## Attorney conversation prompts

1. Are the auto-detected NON_INFRINGEMENT elements present in EVERY independent claim, or only some? (Critical for full-claim avoidance.)
2. Could the patent holder argue claim construction broadening to capture FIELD's architecture? (e.g., 'monitoring node' read broadly.)
3. What dependent claims would survive even if the independent claims are avoided? (Independent != only relevant.)
4. Does the patent file history (prosecution) show the applicant explicitly disclaiming what FIELD does?

## Claim 1 (independent)

| # | Claim element | FIELD verdict | Confidence | Rationale |
|---|---|---|---|---|
| 1.preamble | A method of content handling in an edge region of a content delivery network, the edge region comprising a set of peer machines, wherein each peer machine of the set comprises a processor, and a ca... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.a | receiving a request at a first one of the peer machines, the request having associated therewith a hostname having a value that points to peer machines in the edge region to facilitate load balanci... | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.b | in response to receiving the request, hashing the cache key that includes the value to create a hashed value that also points to one or more other peer machines in the set of peer machines | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.c | based on the hashed value, forwarding the request to at least one other peer machine pointed to by the hashed value | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.d | at the other peer machine, using the hashed value as a cache key for responding to the request | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |
| 1.e | wherein hashing of the cache key and forwarding of the request facilitate spreading of the set of requests associated with the hostname across the set of peer machines | REVIEW | LOW | No FIELD-feature rule matched; needs human review. |

