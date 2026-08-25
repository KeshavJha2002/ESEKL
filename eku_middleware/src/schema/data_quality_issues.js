/**
 * ESEKL MCP Data-Quality Issue Code Registry
 * Single authoritative source of truth for diagnostic audit issue codes across middleware, tests, and documentation.
 */

export const DATA_QUALITY_ISSUE_CODES = {
  MISSING_EXPLICIT_FIELDS: {
    code: 'MISSING_EXPLICIT_FIELDS',
    layer: 'REPO_LOCAL',
    description: 'RepoEKU is missing required core fields (e.g. substrate, claim, localContext).'
  },
  BROKEN_EVIDENCE_LINK: {
    code: 'BROKEN_EVIDENCE_LINK',
    layer: 'REPO_LOCAL',
    description: 'RepoEKU cites non-existent OBS-* or HIST-* identifier.'
  },
  MISSING_SOURCE_PROVENANCE: {
    code: 'MISSING_SOURCE_PROVENANCE',
    layer: 'REPO_LOCAL',
    description: 'RepoEKU marked SOURCE_OBSERVED lacks source file path or query snippet.'
  },
  MISSING_TEST_PROVENANCE: {
    code: 'MISSING_TEST_PROVENANCE',
    layer: 'REPO_LOCAL',
    description: 'RepoEKU marked TEST_OBSERVED lacks test file path or test function name.'
  },
  BROKEN_SUPPORT_LINK: {
    code: 'BROKEN_SUPPORT_LINK',
    layer: 'DOMAIN_ABSTRACTION',
    description: 'Domain EKU cites unknown supportedByRepoEkus identifier.'
  },
  BROKEN_ALTERNATIVE_LINK: {
    code: 'BROKEN_ALTERNATIVE_LINK',
    layer: 'DOMAIN_ABSTRACTION',
    description: 'Domain EKU cites unknown alternativeMechanismRepoEkus identifier.'
  },
  BROKEN_COUNTEREXAMPLE_LINK: {
    code: 'BROKEN_COUNTEREXAMPLE_LINK',
    layer: 'DOMAIN_ABSTRACTION',
    description: 'Domain EKU cites unknown counterexampleRepoEkus identifier.'
  },
  BROKEN_NOT_APPLICABLE_LINK: {
    code: 'BROKEN_NOT_APPLICABLE_LINK',
    layer: 'DOMAIN_ABSTRACTION',
    description: 'Domain EKU cites unknown notApplicableRepoEkus identifier.'
  },
  MISSING_FALSIFICATION_AUDIT: {
    code: 'MISSING_FALSIFICATION_AUDIT',
    layer: 'DOMAIN_ABSTRACTION',
    description: 'Domain EKU lacks counterexample links, not-applicable links, and audit note.'
  }
};

export const ALL_ISSUE_CODES = Object.keys(DATA_QUALITY_ISSUE_CODES);
