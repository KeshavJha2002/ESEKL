# Architecture Proposal (Citing Evidence)

## Core Claims
- We should use CLM-015, CLM-016, CLM-017, CLM-018, CLM-019, CLM-020.
- OBS-BULLMQ-002 and OBS-LITEQUEUE-002 are relevant.
- HIST-RIVER-001 and HIST-NSQ-001 apply here.

## Details
- Just follow standard practices.
- Put messages in a database table and read them with a worker thread.
- If an error happens, just log it.
- Use timestamps from the server machine.
- Make sure to test the code before shipping.
