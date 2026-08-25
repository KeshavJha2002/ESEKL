export function registerDiscoveryTools(server, store) {
  // 1. get_capabilities
  server.registerTool('get_capabilities', {
    description: 'Returns active knowledge layer capabilities, loaded domains, corpus size, and counts of EKUs, claims, and observations.',
    parameters: {
      type: 'object',
      properties: {}
    },
    handler: async () => {
      return store.getCapabilities();
    }
  });

  // 2. list_dossiers
  server.registerTool('list_dossiers', {
    description: 'Lists all repository dossiers with summary metadata, language, and evidence counts.',
    parameters: {
      type: 'object',
      properties: {
        language: { type: 'string', description: 'Filter by language (e.g. go, typescript, java, erlang, sql)' },
        storageEngine: { type: 'string', description: 'Filter by backend (e.g. postgres, redis, sqlite, memory)' },
        page: { type: 'integer', default: 1 },
        pageSize: { type: 'integer', default: 10 }
      }
    },
    handler: async (args) => {
      return store.listDossiers(args);
    }
  });

  // 3. get_dossier_summary
  server.registerTool('get_dossier_summary', {
    description: 'Returns a compact high-level summary of a specific repository dossier without dumping raw files.',
    parameters: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Repository identifier (e.g. bullmq, river, pgmq, nats-server)' }
      },
      required: ['repo']
    },
    handler: async (args) => {
      return store.getDossierSummary(args.repo);
    }
  });

  // 4. list_research_threads
  server.registerTool('list_research_threads', {
    description: 'Returns key cross-repository research themes and failure domains discovered across the corpus.',
    parameters: {
      type: 'object',
      properties: {}
    },
    handler: async () => {
      return {
        domain: 'Queue, Broker & Streaming Systems',
        threads: [
          {
            id: 'thread-01-fencing',
            title: 'Generation Fencing & Domain Result Promotion',
            summary: 'How systems prevent superseded workers from committing side-effects or outbox records after lease expiration.',
            relatedEkus: ['EKU-QUEUE-002', 'EKU-QUEUE-015']
          },
          {
            id: 'thread-02-lease-time',
            title: 'Storage-Time vs Monotonic Clock Lease Recovery',
            summary: 'Pitfalls of caller-supplied now parameters vs authoritative storage timestamps.',
            relatedEkus: ['EKU-QUEUE-003', 'EKU-QUEUE-016']
          },
          {
            id: 'thread-03-counter-isolation',
            title: 'Counter Isolation: Handler Errors vs Process Crashes',
            summary: 'Separation of retry attempts from SIGKILL/OOM worker crashes to prevent poison payload loops.',
            relatedEkus: ['EKU-QUEUE-006', 'EKU-QUEUE-017', 'EKU-QUEUE-018']
          },
          {
            id: 'thread-04-backpressure',
            title: 'Admission Control & Storage Stall Fast-Failure',
            summary: 'Protecting memory stability during downstream storage stalls.',
            relatedEkus: ['EKU-QUEUE-007', 'EKU-QUEUE-019']
          },
          {
            id: 'thread-05-shutdown',
            title: 'Decoupled Worker Drain & Broker Socket Teardown',
            summary: 'Graceful shutdown lifecycles separating network disconnects from in-flight worker deadlines.',
            relatedEkus: ['EKU-QUEUE-012', 'EKU-QUEUE-020']
          }
        ]
      };
    }
  });

  // 5. get_dossier_slice
  server.registerTool('get_dossier_slice', {
    description: 'Returns a paginated, structured slice of a repository dossier for detailed technical examination.',
    parameters: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Repository identifier' },
        sliceType: { type: 'string', enum: ['architecture', 'state_machine', 'lease_management', 'failure_recovery', 'concurrency_control'] },
        page: { type: 'integer', default: 1 },
        pageSize: { type: 'integer', default: 5 }
      },
      required: ['repo', 'sliceType']
    },
    handler: async (args) => {
      return store.getDossierSlice(args.repo, args.sliceType, args);
    }
  });
  // 6. compare_engines
  server.registerTool('compare_engines', {
    description: 'Compares two distributed queue engines or storage backends across architecture styles, claim matrix classifications, and invariants.',
    parameters: {
      type: 'object',
      properties: {
        repoA: { type: 'string', description: 'First repository identifier (e.g. bullmq, river, pgmq)' },
        repoB: { type: 'string', description: 'Second repository identifier (e.g. nats-server, litequeue)' },
        aspect: { type: 'string', description: 'Optional specific feature or domain aspect to compare' }
      },
      required: ['repoA', 'repoB']
    },
    handler: async (args) => {
      return store.compareEngines(args.repoA, args.repoB, args.aspect);
    }
  });

}
