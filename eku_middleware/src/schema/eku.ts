/**
 * Empirical Knowledge Unit (EKU) Schema
 *
 * Grounded architectural knowledge derived from empirical examination of mature systems.
 */

export type EpistemicLevel =
  | "L1_STATIC_FACT"       // Deterministic AST node, type, import, call graph
  | "L2_HISTORICAL_FACT"   // Git commit, PR discussion, CVE fix, issue post-mortem
  | "L3_DYNAMIC_FACT"      // Test assertion, benchmark result, runtime observation
  | "L4_DOCUMENTED_INTENT" // Official docs, ADR, code comments, RFCs
  | "L5_AI_HYPOTHESIS";    // Model-derived pattern (requires L1/L2/L3 grounding to promote)

export interface EvidencePointer {
  repo: string;                         // e.g. "hibiken/asynq"
  commitHash: string;
  evidenceType: "code_ast" | "test_assertion" | "git_commit" | "pr_discussion" | "doc";
  location: string;                     // e.g. "processor.go:L120-L155" or commit hash
  snippetOrSummary: string;
  verifiedInvariant: string;            // What specific rule this proves
  epistemicLevel: EpistemicLevel;
}

export interface FailureModeDefense {
  failureMode: string;                  // What can break (e.g. "Worker GC pause causes dual execution")
  historicalOccurrence?: {
    repo: string;
    issueOrPr: string;
    rootCause: string;
    fixDescription: string;
    commitHash?: string;
  };
  prescribedMitigation: string;
}

export interface CounterExample {
  repo: string;
  alternativeMechanism: string;
  rationale: string;                    // Why this system chose a different trade-off
}

export interface EmpiricalKnowledgeUnit {
  id: string;                           // e.g. "eku:queue:heartbeat-visibility-lease"
  title: string;                        // "Heartbeat-Driven Task Lease with Monotonic Fencing"
  domain: string;                       // e.g. "message_queues", "storage_engines"

  problemContext: {
    problemStatement: string;           // The exact problem being solved
    applicabilityConstraints: string[]; // When this pattern applies
  };

  observedMechanism: {
    abstractionName: string;
    description: string;
    invariants: string[];               // Unbreakable rules required by the mechanism
    stateTransitions?: Array<{
      from: string;
      to: string;
      trigger: string;
      guard?: string;
    }>;
  };

  evidence: EvidencePointer[];

  failureModes: FailureModeDefense[];

  tradeOffs: {
    advantages: string[];
    costs: string[];
    counterExamples: CounterExample[];
  };

  corpusStatistics: {
    sampleSize: number;                 // Total repos analyzed in this domain
    occurrenceCount: number;            // How many implement this mechanism
    confidenceScore: number;            // 0.0 - 1.0 based on evidence strength
    firstDiscovered: string;            // ISO timestamp
    lastVerified: string;
  };
}
