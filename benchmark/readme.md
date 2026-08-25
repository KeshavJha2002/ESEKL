# Benchmark Proofs

This directory contains human-readable benchmark proof for the message_queue ESEKL release.

`evaluation/` remains the runnable machinery: prompts, rubrics, scorers, schemas, and regression scripts. `benchmark/` keeps the narrative artifacts: instructions, workflow, calibration notes, expansion gates, and retained results.

## Files

- [`message_queue_evaluation_summary.md`](./message_queue_evaluation_summary.md): retained result summary across historical message_queue access-condition runs.
- [`blind_rerun_protocol.md`](./blind_rerun_protocol.md): workflow for repeating the blind business-abstraction benchmark.
- [`external_assignment_protocol.md`](./external_assignment_protocol.md): isolation and artifact protocol for realistic startup/product assignments.
- [`corpus_expansion_gate.md`](./corpus_expansion_gate.md): policy deciding when the message_queue corpus is ready for expansion.
- [`scorer_calibration_notes.md`](./scorer_calibration_notes.md): human-vs-mechanical scorer calibration notes.
- [`message_queue_release_history.md`](./message_queue_release_history.md): compact history of v4 patch promotion into the v5 base release.
- [`prompts/`](./prompts/): archived research, synthesis, planner, and falsification prompts used to shape the message_queue knowledge layer.

## Current Stance

Keep this directory small. Raw responses, scorecards, temporary evidence packets, dashboards, and run indexes should not accumulate here. Future benchmark runs should be preregistered, scored, used for gap analysis, and then compacted into a concise markdown result record.
