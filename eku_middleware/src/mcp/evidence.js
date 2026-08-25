export function registerEvidenceTools(server, store) {
  // 1. search_evidence
  server.registerTool('search_evidence', {
    description: 'Searches the empirical knowledge layer across EKUs, claims, observations, and historical failures.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query terms (e.g. clock drift, lock token, SIGKILL, DLQ, backpressure)' },
        filters: {
          type: 'object',
          properties: {
            repo: { type: 'string' },
            objectType: { type: 'string', enum: ['BEHAVIORAL_INVARIANT', 'SOLUTION_FAMILY', 'IMPLEMENTATION_PATTERN'] },
            epistemicType: { type: 'string', enum: ['OBSERVATION', 'HISTORICAL_FAILURE', 'CLAIM', 'EKU'] },
            layer: { type: 'string', enum: ['observation', 'repo_eku', 'keyword_group', 'domain_eku', 'implementation_packet', 'failure_chain'] }
          }
        },
        limit: { type: 'integer', default: 5 }
      },
      required: ['query']
    },
    handler: async (args) => {
      return store.searchEvidence(args.query, {
        ...(args.filters || {}),
        limit: args.limit || 5
      });
    }
  });

  // 2. get_eku
  server.registerTool('get_eku', {
    description: 'Retrieves full structured details of a specific Empirical Knowledge Unit (EKU) including contracts and corpus stats.',
    parameters: {
      type: 'object',
      properties: {
        ekuId: { type: 'string', description: 'EKU ID (e.g. EKU-QUEUE-015)' }
      },
      required: ['ekuId']
    },
    handler: async (args) => {
      return store.getEKU(args.ekuId);
    }
  });

  // 3. get_failure_patterns
  server.registerTool('get_failure_patterns', {
    description: 'Queries recurring second-order failure patterns and vulnerability signatures across the corpus.',
    parameters: {
      type: 'object',
      properties: {
        problemStatement: { type: 'string', description: 'Description of the operational domain or planned feature' },
        filters: {
          type: 'object',
          properties: {
            repo: { type: 'string' }
          }
        },
        limit: { type: 'integer', default: 5 }
      },
      required: ['problemStatement']
    },
    handler: async (args) => {
      const searchRes = store.searchEvidence(args.problemStatement, {
        epistemicType: 'HISTORICAL_FAILURE',
        repo: args.filters ? args.filters.repo : null,
        limit: args.limit || 5
      });

      // If specific search yields few items, return top canonical failure patterns
      let patterns = searchRes.results;
      if (patterns.length === 0) {
        patterns = (store.historicalFailures || []).slice(0, args.limit || 5).map(h => ({
          id: h.id,
          type: 'HISTORICAL_FAILURE',
          title: `${h.repo}: ${h.title}`,
          objectType: 'FAILURE_MODE',
          summary: h.failureMechanism,
          commitHash: h.commitHash,
          epistemicLabel: 'HISTORY_SUPPORTED'
        }));
      }

      return {
        problemStatement: args.problemStatement,
        failurePatterns: patterns
      };
    }
  });

  // 4. explain_provenance
  server.registerTool('explain_provenance', {
    description: 'Returns the complete down-traceability evidence chain for an EKU, claim, or observation ID.',
    parameters: {
      type: 'object',
      properties: {
        evidenceId: { type: 'string', description: 'ID of EKU, Claim, Observation, or Historical Failure' }
      },
      required: ['evidenceId']
    },
    handler: async (args) => {
      return store.explainProvenance(args.evidenceId);
    }
  });
  // 5. get_failure_chains
  server.registerTool('get_failure_chains', {
    description: 'Retrieves first-class normalized historical failure chains (assumption, trigger, observed failure, fix commit, and regression test signal).',
    parameters: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Filter by repository identifier' },
        trigger: { type: 'string', description: 'Filter by triggering condition (e.g. SIGKILL, OOM, lock stall, clock drift)' },
        limit: { type: 'integer', default: 5 }
      }
    },
    handler: async (args) => {
      return store.getFailureChains(args);
    }
  });

  // 6. get_implementation_evidence
  server.registerTool('get_implementation_evidence', {
    description: 'Retrieves compact, source-grounded implementation evidence packets (exact SQL queries, Lua scripts, Go context handlers, and regression test references) for specific mechanisms and substrates.',
    parameters: {
      type: 'object',
      properties: {
        ekuId: { type: 'string', description: 'Filter by linked EKU ID (e.g. EKU-QUEUE-007, EKU-QUEUE-010)' },
        repo: { type: 'string', description: 'Filter by repository identifier (e.g. river, bullmq, litequeue)' },
        substrate: { type: 'string', description: 'Filter by backend substrate (e.g. postgres, redis, sqlite)' },
        mechanism: { type: 'string', description: 'Filter by mechanism keywords (e.g. SKIP LOCKED, epoch fencing, lua)' },
        limit: { type: 'integer', default: 5 }
      }
    },
    handler: async (args) => {
      return store.getImplementationEvidence(args);
    }
  });

  // 7. list_repo_ekus
  server.registerTool('list_repo_ekus', {
    description: 'Lists granular, evidence-bearing Repo-Local EKUs with source and test provenance.',
    parameters: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Filter by repository identifier (e.g. river, bullmq, litequeue)' },
        mechanism: { type: 'string', description: 'Filter by mechanism keywords' },
        objectType: { type: 'string', enum: ['BEHAVIORAL_INVARIANT', 'IMPLEMENTATION_PATTERN', 'FAILURE_RECOVERY_MECHANISM'] },
        page: { type: 'integer', default: 1, description: 'Page number (1-indexed)' },
        pageSize: { type: 'integer', default: 10, description: 'Number of items per page (max 10)' },
        limit: { type: 'integer', description: 'Optional alias for pageSize' }
      }
    },
    handler: async (args) => {
      return store.listRepoEkus(args);
    }
  });

  // 8. get_repo_eku
  server.registerTool('get_repo_eku', {
    description: 'Retrieves full details of a specific Repo-Local EKU including exact source lines, SQL/Lua snippets, and test provenance.',
    parameters: {
      type: 'object',
      properties: {
        repoEkuId: { type: 'string', description: 'Repo EKU ID (e.g. REKU-RIVER-001, REKU-BULLMQ-001)' }
      },
      required: ['repoEkuId']
    },
    handler: async (args) => {
      return store.getRepoEku(args);
    }
  });

  // 9. trace_domain_eku
  server.registerTool('trace_domain_eku', {
    description: 'Down-traces a domain-level EKU to its underlying supporting Repo-Local EKUs, observations, and test suites.',
    parameters: {
      type: 'object',
      properties: {
        ekuId: { type: 'string', description: 'Domain EKU ID (e.g. EKU-QUEUE-007, EKU-QUEUE-010)' }
      },
      required: ['ekuId']
    },
    handler: async (args) => {
      return store.traceDomainEku(args);
    }
  });

  // 10. list_keyword_groups
  server.registerTool('list_keyword_groups', {
    description: 'Lists cross-cutting common and unique keyword facet groups aggregating Repo-Local EKUs and Domain-Level EKUs.',
    parameters: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: 'Filter by keyword substring' },
        facet: { type: 'string', enum: ['COMMON_KEYWORD', 'UNIQUE_KEYWORD', 'MECHANISM_FAMILY', 'SUBSTRATE_FAMILY'] },
        commonOnly: { type: 'boolean', description: 'Filter for common cross-repository keywords only' },
        uniqueOnly: { type: 'boolean', description: 'Filter for repo-specific unique keywords only' },
        page: { type: 'integer', default: 1, description: 'Page number (1-indexed)' },
        pageSize: { type: 'integer', default: 10, description: 'Number of items per page (max 20)' },
        limit: { type: 'integer', description: 'Optional alias for pageSize' }
      }
    },
    handler: async (args) => {
      return store.listKeywordGroups(args);
    }
  });

  // 11. get_keyword_group
  server.registerTool('get_keyword_group', {
    description: 'Retrieves full details for a specific keyword group including participating Repo-Local EKUs and linked Domain EKUs.',
    parameters: {
      type: 'object',
      properties: {
        groupId: { type: 'string', description: 'Keyword group ID (e.g. skip_locked, token_fencing, row_locking, postgres)' }
      },
      required: ['groupId']
    },
    handler: async (args) => {
      return store.getKeywordGroup(args);
    }
  });

  // 12. get_data_quality_report
  server.registerTool('get_data_quality_report', {
    description: 'Generates a bounded data-quality diagnostic audit across Repo-Local EKUs and Domain EKUs, surfacing missing fields or broken references.',
    parameters: {
      type: 'object',
      properties: {
        layer: { type: 'string', enum: ['REPO_LOCAL', 'DOMAIN_ABSTRACTION'], description: 'Optional layer filter' },
        limit: { type: 'integer', default: 20, description: 'Maximum number of diagnostic issues to return (max 50)' }
      }
    },
    handler: async (args) => {
      return store.getDataQualityReport(args);
    }
  });
}
