/**
 * Repository Empirical Dossier Schema
 *
 * Captures the multi-agent empirical findings for a single repository.
 */

import type { EvidencePointer, FailureModeDefense } from "./eku.js";

export interface ComponentBoundary {
  name: string;
  role: string;                         // e.g. "Broker", "Worker Pool", "Heartbeat Monitor", "Scheduler"
  primaryFiles: string[];
  publicInterfaces: string[];
  dependencies: string[];               // Internal components this depends on
  stateManaged: string[];               // State entities managed by this component
}

export interface StateMachineModel {
  name: string;                         // e.g. "Task State Lifecycle"
  states: string[];                     // e.g. ["Pending", "Active", "Completed", "Retry", "Archived"]
  initialState: string;
  terminalStates: string[];
  transitions: Array<{
    from: string;
    to: string;
    event: string;
    guardConditions?: string[];
    evidence: EvidencePointer;
  }>;
}

export interface InvariantRecord {
  id: string;                           // e.g. "INV-01"
  statement: string;                    // e.g. "A task cannot be acquired by more than 1 active worker simultaneously"
  enforcingMechanisms: string[];        // e.g. "Redis SET NX with lease expiration"
  testEvidence: EvidencePointer[];      // Concrete test files verifying this
}

export interface RepoDossier {
  repoName: string;                     // e.g. "hibiken/asynq"
  domain: string;                       // e.g. "message_queues"
  gitCommitHash: string;
  analyzedAt: string;

  overview: {
    purpose: string;
    architectureType: string;           // e.g. "Client-Server with Redis Broker"
    keyDifferentiators: string[];
  };

  components: ComponentBoundary[];
  stateMachines: StateMachineModel[];
  invariants: InvariantRecord[];
  failureModesAndDefenses: FailureModeDefense[];

  historicalEvolution: Array<{
    majorMilestoneOrBug: string;
    rootCause: string;
    architecturalChange: string;
    evidence: EvidencePointer;
  }>;

  adversarialCritique: {
    edgeCasesBypassingInvariants: string[];
    performanceBottlenecksUnderLoad: string[];
    untestedAssumptions: string[];
  };
}
