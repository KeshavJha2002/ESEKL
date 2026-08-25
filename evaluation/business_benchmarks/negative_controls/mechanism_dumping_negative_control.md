# Technical Design: Queue & Broker Mechanisms

## Technology Options
- We could use BullMQ with Redis EVAL scripts (`moveToActive-11.lua`, `removeLock.lua`).
- We could use River with PostgreSQL CTEs (`SELECT ... FOR UPDATE SKIP LOCKED`).
- We could use Redpanda with direct I/O memory buffers aligned to 4KB sectors.
- We could use RocketMQ with 20B fixed ConsumeQueue indices.
- We could use NATS JetStream with sliding window consumer acks.
- We could use Artemis with Linux libaio kernel journal integration.

## Implementation Details
- Redis keys use sorted sets and hashes.
- PostgreSQL tables need partial indexes.
- Linux kernels need `vm.dirty_ratio` tuning.

## Summary
All of these technologies are mature and provide great performance for high-throughput messaging.
