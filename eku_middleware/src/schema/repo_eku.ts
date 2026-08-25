/**
 * Repo-Local Empirical Knowledge Unit (RepoEKU) TypeScript Definition
 * Represents evidence-bearing, concrete repository implementation mechanisms.
 */

export type RepoObjectType =
  | 'BEHAVIORAL_INVARIANT'
  | 'IMPLEMENTATION_PATTERN'
  | 'FAILURE_RECOVERY_MECHANISM';

export type RepoSubstrateType =
  | 'postgres'
  | 'redis'
  | 'sqlite'
  | 'memory'
  | 'file'
  | 'raft'
  | 'amqp'
  | 'native';

export type RepoEpistemicLabel =
  | 'SOURCE_OBSERVED'
  | 'TEST_OBSERVED'
  | 'HISTORY_SUPPORTED'
  | 'DOCUMENTED'
  | 'MODEL_INFERRED_PENDING_SOURCE_TRACE';

export interface RepoSourceProvenance {
  filePath: string;
  lineRange?: [number, number];
  queryOrCodeSnippet?: string;
  symbol?: string;
}

export interface RepoTestProvenance {
  filePath: string;
  testName: string;
  assertionSnippet?: string;
}

export interface RepoHistoryProvenance {
  commitHash?: string;
  failureId?: string;
  prOrIssue?: string;
  fixDescription?: string;
}

export interface RepoKeywordFacets {
  concurrencyControl?: string[];
  stateStorage?: string[];
  ownershipModel?: string[];
  failureRecovery?: string[];
  scheduling?: string[];
  shutdownDrain?: string[];
  substrate?: string[];
  [customFacet: string]: string[] | undefined;
}

export interface RepoEKU {
  id: string; // e.g. REKU-RIVER-001
  repository: string; // e.g. river
  domain: string; // e.g. Queue, Broker & Distributed Workflow Systems
  substrate: RepoSubstrateType; // e.g. postgres
  objectType: RepoObjectType;
  claim: string;
  mechanism: string;
  applicabilityConditions: string[];
  evidenceIds: string[];
  commonKeywords: string[];
  uniqueKeywords: string[];
  keywordFacets?: RepoKeywordFacets;
  localContext: string;
  linkedDomainEkus: string[]; // e.g. ["EKU-QUEUE-007", "EKU-QUEUE-010"]
  linkedClaims: string[]; // e.g. ["CLM-007", "CLM-010"]
  sourceProvenance?: RepoSourceProvenance;
  testProvenance?: RepoTestProvenance;
  historyProvenance?: RepoHistoryProvenance;
  epistemicLabels: RepoEpistemicLabel[];
  abstractionLevel: 'REPO_LOCAL';
  status: 'ACTIVE' | 'DEPRECATED' | 'PROMOTED_TO_DOMAIN';
}
