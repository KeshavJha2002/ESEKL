import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA_QUALITY_ISSUE_CODES } from '../schema/data_quality_issues.js';

const ISSUE = Object.fromEntries(
  Object.entries(DATA_QUALITY_ISSUE_CODES).map(([name, spec]) => [name, spec.code])
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function repoFsName(repo) {
  return String(repo || '').replace(/-/g, '_');
}

function resolveStorePaths(storeRoot) {
  const roots = storeRoot
    ? [path.resolve(storeRoot)]
    : [
        path.resolve(process.cwd(), '.eku_store'),
        path.resolve(process.cwd(), 'eku_store'),
        path.resolve(__dirname, '../../../eku_store')
      ];

  for (const root of roots) {
    const directStoreFile = path.join(root, 'synthesized_queue_ekus.json');
    if (fs.existsSync(directStoreFile)) {
      return {
        storeRoot: path.dirname(root),
        ekuStorePath: root,
        factoryPath: path.join(path.dirname(root), 'factory')
      };
    }

    const nestedStore = path.join(root, 'eku_store');
    const nestedStoreFile = path.join(nestedStore, 'synthesized_queue_ekus.json');
    if (fs.existsSync(nestedStoreFile)) {
      return {
        storeRoot: root,
        ekuStorePath: nestedStore,
        factoryPath: path.join(root, 'factory')
      };
    }
  }

  const fallbackRoot = storeRoot ? path.resolve(storeRoot) : path.resolve(process.cwd());
  return {
    storeRoot: fallbackRoot,
    ekuStorePath: path.join(fallbackRoot, 'eku_store'),
    factoryPath: path.join(fallbackRoot, 'factory')
  };
}

export class ESEKLStore {
  constructor(storeRoot = null) {
    const paths = resolveStorePaths(storeRoot);
    this.storeRoot = paths.storeRoot;
    this.ekuStorePath = paths.ekuStorePath;
    this.factoryPath = paths.factoryPath;
    this.isLoaded = false;
  }

  load() {
    if (this.isLoaded) return;

    try {
      // 1. Load Base EKUs
      const ekusFile = path.join(this.ekuStorePath, 'synthesized_queue_ekus.json');
      const ekusData = JSON.parse(fs.readFileSync(ekusFile, 'utf-8'));
      this.ekus = ekusData.ekus || [];
      this.ekusById = new Map(this.ekus.map(e => [e.id, e]));

      // 2. Load Claim Matrix
      const matrixFile = path.join(this.ekuStorePath, 'claim_matrix.json');
      const matrixData = JSON.parse(fs.readFileSync(matrixFile, 'utf-8'));
      this.corpus = matrixData.corpus || [];
      this.matrix = matrixData.matrix || [];
      this.matrixById = new Map(this.matrix.map(m => [m.id, m]));

      // 3. Load Observations
      const obsFile = path.join(this.ekuStorePath, 'evidence', 'observations.json');
      const obsData = JSON.parse(fs.readFileSync(obsFile, 'utf-8'));
      this.observations = obsData || [];
      this.observationsById = new Map(this.observations.map(o => [o.id, o]));

      // 4. Load Claims
      const claimsFile = path.join(this.ekuStorePath, 'evidence', 'claims.json');
      const claimsData = JSON.parse(fs.readFileSync(claimsFile, 'utf-8'));
      this.claims = Array.isArray(claimsData) ? claimsData : (claimsData.claims || []);
      this.claimsById = new Map(this.claims.map(c => [c.id, c]));

      // 5. Load Historical Failures
      const histFile = path.join(this.ekuStorePath, 'evidence', 'historical_failures.json');
      const histData = JSON.parse(fs.readFileSync(histFile, 'utf-8'));
      this.historicalFailures = histData || [];
      this.historicalFailuresById = new Map(this.historicalFailures.map(h => [h.id, h]));

      // 6. Load Corpus Manifest
      const corpusFile = path.join(this.ekuStorePath, 'corpus_manifest.json');
      if (fs.existsSync(corpusFile)) {
        this.corpusManifest = JSON.parse(fs.readFileSync(corpusFile, 'utf-8'));
      } else {
        this.corpusManifest = { repositories: [] };
      }
      this.corpusManifestByRepo = new Map((this.corpusManifest.repositories || []).map(r => [r.repo, r]));

      const factoryLockFile = path.join(this.ekuStorePath, 'release', 'factory_repo_lock.json');
      if (fs.existsSync(factoryLockFile)) {
        const factoryLock = JSON.parse(fs.readFileSync(factoryLockFile, 'utf-8'));
        this.factoryLockByRepo = new Map((factoryLock.repositories || []).map(r => [r.repo, r]));
      } else {
        this.factoryLockByRepo = new Map();
      }

      // 7. Load Repo-Local EKUs
      this.repoEkus = [];
      this.repoEkuLoadErrors = [];
      const repoEkuDir = path.join(this.ekuStorePath, 'repo_ekus');
      if (fs.existsSync(repoEkuDir)) {
        const rFiles = fs.readdirSync(repoEkuDir).filter(f => f.endsWith('.json'));
        for (const rf of rFiles) {
          try {
            const list = JSON.parse(fs.readFileSync(path.join(repoEkuDir, rf), 'utf-8'));
            if (Array.isArray(list)) {
              this.repoEkus.push(...list);
            }
          } catch (e) {
            this.repoEkuLoadErrors.push({
              file: path.join('eku_store', 'repo_ekus', rf),
              error: e.message
            });
          }
        }
      }
      this.repoEkusById = new Map(this.repoEkus.map(r => [r.id, r]));

      this.isLoaded = true;
    } catch (err) {
      throw new Error(`Failed to load ESEKL store from ${this.ekuStorePath}: ${err.message}`);
    }
  }

  getCapabilities() {
    this.load();
    const repoEkuCounts = {};
    for (const repo of this.corpus) {
      repoEkuCounts[repo] = 0;
    }
    for (const reku of this.repoEkus || []) {
      const repo = reku.repository;
      repoEkuCounts[repo] = (repoEkuCounts[repo] || 0) + 1;
    }
    const repositoriesWithRepoEkus = Object.entries(repoEkuCounts)
      .filter(([, count]) => count > 0)
      .map(([repo]) => repo);
    const repositoriesPendingRepoEkus = this.corpus.filter(repo => (repoEkuCounts[repo] || 0) === 0);

    return {
      domain: "Queue, Broker & Streaming Systems",
      corpusSize: this.corpus.length,
      repositories: this.corpus,
      totalEkus: this.ekus.length,
      totalRepoEkus: this.repoEkus.length,
      totalClaims: this.claims.length,
      totalObservations: this.observations.length,
      totalHistoricalFailures: this.historicalFailures.length,
      repoEkuCoverage: {
        repositoriesWithRepoEkus,
        repositoriesPendingRepoEkus,
        perRepositoryCounts: repoEkuCounts,
        coverageRatio: `${repositoriesWithRepoEkus.length}/${this.corpus.length}`,
        loadErrors: this.repoEkuLoadErrors || [],
        epistemicStatus: "COVERAGE_METADATA"
      },
      supportedFilters: ["repo", "abstractionLevel", "objectType", "status"],
      layeredRetrievalTools: [
        "list_repo_ekus",
        "get_repo_eku",
        "list_keyword_groups",
        "get_keyword_group",
        "trace_domain_eku",
        "get_implementation_evidence"
      ],
      version: "5.0.0-consolidated"
    };
  }

  getRepoSourceInfo(repo) {
    this.load();
    const manifest = this.corpusManifestByRepo.get(repo) || null;
    const lock = this.factoryLockByRepo.get(repo) || null;
    if (!manifest && !lock) return null;
    return {
      ...(manifest || {}),
      ...(lock || {}),
      sourceCommit: lock?.validatedSourceCommit || lock?.checkedOutCommit || manifest?.commit || lock?.manifestCommit
    };
  }

  buildGithubUrl(repo, filePath, commitOverride = null, raw = false) {
    const info = this.getRepoSourceInfo(repo);
    if (!info || !info.targetRepo || !filePath) return null;
    const commit = commitOverride || info.sourceCommit || info.commit || info.manifestCommit;
    const cleanPath = String(filePath).replace(/^\/+/, '');
    const base = raw ? 'https://raw.githubusercontent.com' : 'https://github.com';
    const mode = raw ? '' : '/blob';
    return `${base}/${info.targetRepo}${mode}/${commit}/${cleanPath}`;
  }

  buildGithubPermalink(repo, filePath, lineRange, commitOverride = null) {
    const url = this.buildGithubUrl(repo, filePath, commitOverride, false);
    if (!url || !Array.isArray(lineRange) || lineRange.length !== 2) return url;
    return `${url}#L${lineRange[0]}-L${lineRange[1]}`;
  }

  getEKU(id) {
    this.load();
    const eku = this.ekusById.get(id);
    if (!eku) {
      return { error: "NOT_FOUND", message: `EKU '${id}' not found`, availableIds: Array.from(this.ekusById.keys()) };
    }
    return eku;
  }

  getClaim(id) {
    this.load();
    const claim = this.claimsById.get(id);
    if (!claim) {
      return { error: "NOT_FOUND", message: `Claim '${id}' not found`, availableIds: Array.from(this.claimsById.keys()) };
    }
    return claim;
  }

  getObservation(id) {
    this.load();
    const obs = this.observationsById.get(id);
    if (!obs) {
      return { error: "NOT_FOUND", message: `Observation '${id}' not found`, availableIds: Array.from(this.observationsById.keys()) };
    }
    return obs;
  }

  getHistoricalFailure(id) {
    this.load();
    const hist = this.historicalFailuresById.get(id);
    if (!hist) {
      return { error: "NOT_FOUND", message: `Historical failure '${id}' not found`, availableIds: Array.from(this.historicalFailuresById.keys()) };
    }
    return hist;
  }

  getEvidence(id) {
    this.load();
    if (id.startsWith('EKU-')) return this.getEKU(id);
    if (id.startsWith('CLM-')) return this.getClaim(id);
    if (id.startsWith('OBS-')) return this.getObservation(id);
    if (id.startsWith('HIST-')) return this.getHistoricalFailure(id);
    return { error: "NOT_FOUND", message: `Unrecognized evidence ID format '${id}'` };
  }

  listDossiers({ language, storageEngine, page = 1, pageSize = 10 } = {}) {
    pageSize = Math.min(Math.max(parseInt(pageSize) || 10, 1), 10);
    this.load();
    const all = (this.corpusManifest.repositories || []).map(r => {
      const repoName = r.name || r.id || r.repo;
      const obsCount = this.observations.filter(o => o.repo && o.repo.includes(repoName)).length;
      const histCount = this.historicalFailures.filter(h => h.repo && h.repo.includes(repoName)).length;
      return {
        repo: repoName,
        language: r.language || "unknown",
        storageEngine: r.storageEngine || r.backend || "native",
        architectureStyle: r.architectureStyle || r.description || "Distributed Queue / Engine",
        totalObservations: obsCount,
        totalHistoricalFailures: histCount,
        summary: r.summary || r.description || `Empirical dossier for ${repoName}`
      };
    });

    let filtered = all;
    if (language) {
      filtered = filtered.filter(d => d.language.toLowerCase() === language.toLowerCase());
    }
    if (storageEngine) {
      filtered = filtered.filter(d => d.storageEngine.toLowerCase().includes(storageEngine.toLowerCase()));
    }

    const total = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    return {
      total,
      page,
      pageSize,
      dossiers: paginated
    };
  }

  getDossierSummary(repo) {
    this.load();
    const cleanRepo = repo.toLowerCase().replace(/^(factory\/|.*\/\/)/, '');
    const repoKey = cleanRepo.replace(/_/g, '-');
    const dossierMeta = (this.corpusManifest.repositories || []).find(r =>
      (r.name && r.name.toLowerCase().includes(cleanRepo)) ||
      (r.name && r.name.toLowerCase().includes(repoKey)) ||
      (r.repo && r.repo.toLowerCase().includes(cleanRepo)) ||
      (r.repo && r.repo.toLowerCase().includes(repoKey)) ||
      (r.id && r.id.toLowerCase().includes(cleanRepo))
    );

    const relatedObs = this.observations.filter(o => {
      const observedRepo = String(o.repo || '').toLowerCase();
      return observedRepo.includes(cleanRepo) || observedRepo.includes(repoKey);
    });
    const relatedHist = this.historicalFailures.filter(h => {
      const observedRepo = String(h.repo || '').toLowerCase();
      return observedRepo.includes(cleanRepo) || observedRepo.includes(repoKey);
    });

    return {
      repo: repo,
      fullName: dossierMeta ? (dossierMeta.name || dossierMeta.repo) : repo,
      primaryLanguage: dossierMeta ? dossierMeta.language : "various",
      storageBackend: dossierMeta ? (dossierMeta.storageEngine || "native") : "native",
      totalObservations: relatedObs.length,
      totalHistoricalFailures: relatedHist.length,
      keyMechanisms: relatedObs.slice(0, 3).map(o => `${o.title || o.filePath} (${o.id})`),
      discoveredEdgeConditions: relatedHist.map(h => `${h.title} (${h.id})`),
      availableSlices: ["architecture", "state_machine", "lease_management", "failure_recovery", "concurrency_control"]
    };
  }

  getDossierSlice(repo, sliceType, { page = 1, pageSize = 5 } = {}) {
    this.load();
    const cleanRepo = repo.toLowerCase().replace(/^(factory\/|.*\/\/)/, '').split('/').pop();
    const repoKey = cleanRepo.replace(/_/g, '-');
    const repoFs = repoFsName(cleanRepo);
    const repoDir = path.join(this.ekuStorePath, repoFs);

    let items = [];

    // Try loading from per-repository dossier artifact
    const dossierSource = `eku_store/${repoFs}/dossier_${repoFs}.json`;
    const dossierFile = path.join(repoDir, `dossier_${repoFs}.json`);
    let dossierData = null;
    if (fs.existsSync(dossierFile)) {
      try {
        dossierData = JSON.parse(fs.readFileSync(dossierFile, 'utf-8'));
      } catch (e) {}
    }

    const testFile = path.join(repoDir, 'test_invariants.json');
    let testData = null;
    if (fs.existsSync(testFile)) {
      try {
        testData = JSON.parse(fs.readFileSync(testFile, 'utf-8'));
      } catch (e) {}
    }

    const histFile = path.join(repoDir, 'git_history.json');
    let histData = null;
    if (fs.existsSync(histFile)) {
      try {
        histData = JSON.parse(fs.readFileSync(histFile, 'utf-8'));
      } catch (e) {}
    }

    const relatedObs = this.observations.filter(o => {
      const observedRepo = String(o.repo || '').toLowerCase();
      return observedRepo.includes(cleanRepo) || observedRepo.includes(repoKey);
    });
    const relatedHist = this.historicalFailures.filter(h => {
      const observedRepo = String(h.repo || '').toLowerCase();
      return observedRepo.includes(cleanRepo) || observedRepo.includes(repoKey);
    });

    if (sliceType === 'state_machine') {
      if (dossierData && dossierData.stateMachines) {
        for (const sm of (Array.isArray(dossierData.stateMachines) ? dossierData.stateMachines : [dossierData.stateMachines])) {
          items.push({
            topic: sm.name || 'State Machine Invariants',
            states: sm.states || sm.statesDescription,
            transitions: sm.transitions || sm.rules,
            artifactSource: dossierSource,
            epistemicStatus: 'SOURCE_OBSERVED'
          });
        }
      }
      for (const obs of relatedObs.filter(o => /state|status|moveTo|driver|channel/i.test(`${o.filePath} ${o.description || ''}`))) {
        items.push({
          id: obs.id,
          topic: `State Transition in ${obs.filePath}`,
          lineRange: obs.lineRange,
          testName: obs.testName,
          mechanism: obs.description,
          artifactSource: 'eku_store/evidence/observations.json',
          epistemicStatus: 'SOURCE_OBSERVED'
        });
      }
    } else if (sliceType === 'lease_management') {
      if (dossierData && dossierData.invariants) {
        for (const inv of (dossierData.invariants || []).filter(i => /lease|timeout|visibility|stalled|lock/i.test(JSON.stringify(i)))) {
          items.push({
            topic: inv.name || inv.title || 'Lease Invariant',
            invariant: inv.description || inv.statement,
            enforcement: inv.enforcementMechanism || inv.codeLocation,
            artifactSource: dossierSource,
            epistemicStatus: 'SOURCE_OBSERVED'
          });
        }
      }
      for (const obs of relatedObs.filter(o => /lease|timeout|visibility|extend|heartbeat|stalled|lock/i.test(`${o.filePath} ${o.description || ''}`))) {
        items.push({
          id: obs.id,
          topic: obs.filePath,
          lineRange: obs.lineRange,
          testName: obs.testName,
          mechanism: obs.description,
          artifactSource: 'eku_store/evidence/observations.json',
          epistemicStatus: 'SOURCE_OBSERVED'
        });
      }
    } else if (sliceType === 'failure_recovery') {
      for (const h of relatedHist) {
        items.push({
          id: h.id,
          topic: h.title,
          mechanism: h.failureMechanism,
          prevention: h.preventionContract,
          commitHash: h.commitHash,
          artifactSource: 'eku_store/evidence/historical_failures.json',
          epistemicStatus: 'HISTORY_SUPPORTED'
        });
      }
      if (dossierData && dossierData.failureModesAndDefenses) {
        for (const fm of (Array.isArray(dossierData.failureModesAndDefenses) ? dossierData.failureModesAndDefenses : [dossierData.failureModesAndDefenses])) {
          items.push({
            topic: fm.failureMode || fm.name || 'Failure Mode',
            defense: fm.defenseMechanism || fm.mitigation,
            edgeCondition: fm.edgeCondition || fm.vulnerability,
            artifactSource: dossierSource,
            epistemicStatus: 'MODEL_INFERRED'
          });
        }
      }
    } else if (sliceType === 'concurrency_control') {
      if (dossierData && dossierData.unresolvedContradictionsAndBypasses) {
        for (const c of (Array.isArray(dossierData.unresolvedContradictionsAndBypasses) ? dossierData.unresolvedContradictionsAndBypasses : [dossierData.unresolvedContradictionsAndBypasses])) {
          items.push({
            topic: c.title || 'Concurrency Edge Condition',
            contradiction: c.description || c.issue,
            artifactSource: dossierSource,
            epistemicStatus: 'MODEL_INFERRED'
          });
        }
      }
      for (const obs of relatedObs.filter(o => /concurrency|mutex|lock|semaphore|pool|atomic|skip locked/i.test(`${o.filePath} ${o.description || ''}`))) {
        items.push({
          id: obs.id,
          topic: obs.filePath,
          lineRange: obs.lineRange,
          mechanism: obs.description,
          artifactSource: 'eku_store/evidence/observations.json',
          epistemicStatus: 'SOURCE_OBSERVED'
        });
      }
    } else {
      // General architecture slice
      if (dossierData) {
        items.push({
          topic: 'Architecture Overview',
          overview: dossierData.overview || dossierData.architectureStyle,
          components: dossierData.components,
          artifactSource: dossierSource,
          epistemicStatus: 'MODEL_INFERRED'
        });
      }
      for (const obs of relatedObs) {
        items.push({
          id: obs.id,
          topic: obs.filePath,
          lineRange: obs.lineRange,
          mechanism: obs.description,
          artifactSource: 'eku_store/evidence/observations.json',
          epistemicStatus: 'SOURCE_OBSERVED'
        });
      }
    }

    const totalItems = items.length;
    const startIndex = (page - 1) * pageSize;
    const paginated = items.slice(startIndex, startIndex + pageSize);

    return {
      repo,
      sliceType,
      page,
      pageSize,
      totalItems,
      content: paginated
    };
  }

  searchEvidence(query, { repo, objectType, epistemicType, layer, storageEngine, limit = 5 } = {}) {
    limit = Math.min(Math.max(parseInt(limit) || 5, 1), 10);
    this.load();

    const validLayers = ['observation', 'repo_eku', 'keyword_group', 'domain_eku', 'implementation_packet', 'failure_chain'];
    if (layer && !validLayers.includes(layer)) {
      return {
        error: 'INVALID_REQUEST',
        message: `Unsupported layer filter '${layer}'.`,
        supportedLayers: validLayers
      };
    }

    const q = query.toLowerCase();
    const queryTokens = q.split(/\W+/).filter(t => t.length > 2);
    const scoredResults = [];

    // Search Repo-Local EKUs
    if (!layer || layer === 'repo_eku') {
      for (const reku of (this.repoEkus || [])) {
        if (repo && reku.repository && !reku.repository.toLowerCase().includes(repo.toLowerCase())) continue;
        const text = `${reku.id} ${reku.repository} ${reku.mechanism} ${reku.claim} ${(reku.commonKeywords||[]).join(' ')} ${(reku.uniqueKeywords||[]).join(' ')}`.toLowerCase();
        let matchScore = 0;
        if (text.includes(q)) matchScore += 12;
        for (const t of queryTokens) {
          if (text.includes(t)) matchScore += 3;
        }
        if (matchScore > 0) {
          scoredResults.push({
            score: matchScore,
            item: {
              id: reku.id,
              type: "REPO_EKU",
              repository: reku.repository,
              title: `${reku.repository}: ${reku.mechanism}`,
              objectType: reku.objectType,
              summary: reku.claim,
              commonKeywords: reku.commonKeywords || [],
              uniqueKeywords: reku.uniqueKeywords || [],
              localContext: reku.localContext || '',
              epistemicLabel: "REPO_LOCAL",
              epistemicStatus: "REPO_LOCAL"
            }
          });
        }
      }
    }

    // Search Keyword Groups
    if (!layer || layer === 'keyword_group') {
      for (const kg of this.getAllKeywordGroups()) {
        const text = `${kg.groupId} ${kg.keyword} ${kg.repositories.join(' ')}`.toLowerCase();
        let matchScore = 0;
        if (text.includes(q)) matchScore += 10;
        for (const t of queryTokens) {
          if (text.includes(t)) matchScore += 2;
        }
        if (matchScore > 0) {
          scoredResults.push({
            score: matchScore,
            item: {
              id: `GROUP-${kg.groupId.toUpperCase()}`,
              type: "KEYWORD_GROUP",
              groupType: kg.groupType,
              keyword: kg.keyword,
              repositories: kg.repositories,
              participatingRepoEkusCount: kg.participatingRepoEkus.length,
              participatingDomainEkusCount: kg.participatingDomainEkus.length,
              epistemicLabel: "KEYWORD_GROUP_VIEW",
              epistemicStatus: "KEYWORD_GROUP_VIEW"
            }
          });
        }
      }
    }

    // Search Domain EKUs
    if ((!layer || layer === 'domain_eku') && (!epistemicType || epistemicType === 'EKU')) {
      for (const eku of this.ekus) {
        if (objectType && eku.objectType !== objectType) continue;
        const text = `${eku.id} ${eku.title} ${eku.problem} ${eku.behavioralInvariant} ${eku.designContract} ${eku.applicabilityConstraints.join(' ')}`.toLowerCase();
        let matchScore = 0;
        if (text.includes(q)) matchScore += 10;
        for (const t of queryTokens) {
          if (text.includes(t)) matchScore += 2;
        }
        if (matchScore > 0) {
          scoredResults.push({
            score: matchScore,
            item: {
              id: eku.id,
              type: "EKU",
              title: eku.title,
              objectType: eku.objectType,
              summary: eku.behavioralInvariant || eku.problem,
              epistemicLabel: "CROSS_REPO_ABSTRACTION"
            }
          });
        }
      }
    }

    // Search Claims
    if (!epistemicType || epistemicType === 'CLAIM') {
      for (const claim of this.claims) {
        const text = `${claim.id} ${claim.title} ${claim.statement || claim.description}`.toLowerCase();
        let matchScore = 0;
        if (text.includes(q)) matchScore += 10;
        for (const t of queryTokens) {
          if (text.includes(t)) matchScore += 2;
        }
        if (matchScore > 0) {
          scoredResults.push({
            score: matchScore,
            item: {
              id: claim.id,
              type: "CLAIM",
              title: claim.title,
              objectType: claim.abstractionLevel,
              summary: claim.statement || claim.description,
              epistemicLabel: claim.modelInferred ? "MODEL_INFERRED" : "SOURCE_OBSERVED"
            }
          });
        }
      }
    }

    // Search Observations
    if ((!layer || layer === 'observation') && (!epistemicType || epistemicType === 'OBSERVATION')) {
      for (const obs of this.observations) {
        if (repo && obs.repo && !obs.repo.toLowerCase().includes(repo.toLowerCase())) continue;
        const text = `${obs.id} ${obs.repo} ${obs.filePath} ${obs.description || ''} ${obs.testName || ''}`.toLowerCase();
        let matchScore = 0;
        if (text.includes(q)) matchScore += 10;
        for (const t of queryTokens) {
          if (text.includes(t)) matchScore += 2;
        }
        if (matchScore > 0) {
          scoredResults.push({
            score: matchScore,
            item: {
              id: obs.id,
              type: "OBSERVATION",
              title: `${obs.repo}: ${obs.filePath}`,
              objectType: "CODE_OBSERVATION",
              summary: obs.description || `Observed code at ${obs.filePath}`,
              epistemicLabel: "SOURCE_OBSERVED"
            }
          });
        }
      }
    }

    // Search Historical Failures
    if ((!layer || layer === 'failure_chain') && (!epistemicType || epistemicType === 'HISTORICAL_FAILURE')) {
      for (const h of this.historicalFailures) {
        if (repo && h.repo && !h.repo.toLowerCase().includes(repo.toLowerCase())) continue;
        const text = `${h.id} ${h.repo} ${h.title} ${h.failureMechanism} ${h.commitHash}`.toLowerCase();
        let matchScore = 0;
        if (text.includes(q)) matchScore += 10;
        for (const t of queryTokens) {
          if (text.includes(t)) matchScore += 2;
        }
        if (matchScore > 0) {
          scoredResults.push({
            score: matchScore,
            item: {
              id: h.id,
              type: "HISTORICAL_FAILURE",
              title: `${h.repo}: ${h.title}`,
              objectType: "FAILURE_MODE",
              summary: h.failureMechanism,
              commitHash: h.commitHash,
              epistemicLabel: "HISTORY_SUPPORTED"
            }
          });
        }
      }
    }

    scoredResults.sort((a, b) => b.score - a.score);
    const results = scoredResults.map(s => s.item);

    return {
      query,
      totalMatches: results.length,
      results: results.slice(0, limit)
    };
  }

  explainProvenance(evidenceId) {
    this.load();
    if (evidenceId.startsWith('OBS-')) {
      const obs = this.getObservation(evidenceId);
      if (obs.error) return obs;
      return {
        evidenceId: obs.id,
        type: "OBSERVATION",
        repository: obs.repo,
        sourceRepository: this.getRepoSourceInfo(obs.repo)?.targetRepo || obs.repo,
        commitHash: this.getRepoSourceInfo(obs.repo)?.sourceCommit || null,
        filePath: obs.filePath,
        lineRange: obs.lineRange,
        sourceUrl: this.buildGithubPermalink(obs.repo, obs.filePath, obs.lineRange),
        rawSourceUrl: this.buildGithubUrl(obs.repo, obs.filePath, null, true),
        snippetSha256: obs.snippetSha256,
        semanticTest: obs.testName,
        epistemicStatus: "SOURCE_OBSERVED"
      };
    }

    if (evidenceId.startsWith('HIST-')) {
      const hist = this.getHistoricalFailure(evidenceId);
      if (hist.error) return hist;
      return {
        evidenceId: hist.id,
        type: "HISTORICAL_FAILURE",
        repository: hist.repo,
        sourceRepository: this.getRepoSourceInfo(hist.repo)?.targetRepo || hist.repo,
        commitHash: hist.fixCommit || hist.commitHash,
        fixCommit: hist.fixCommit,
        changedFileUrls: (hist.changedFiles || []).map(filePath => ({
          filePath,
          sourceUrl: this.buildGithubUrl(hist.repo, filePath, hist.fixCommit, false),
          rawSourceUrl: this.buildGithubUrl(hist.repo, filePath, hist.fixCommit, true)
        })),
        originalAssumption: hist.assumption,
        triggeringCondition: hist.trigger,
        observedFailure: hist.observedFailure,
        generalizedConstraint: hist.generalizedConstraint,
        regressionTest: hist.regressionTest,
        epistemicStatus: "HISTORY_SUPPORTED"
      };
    }

    if (evidenceId.startsWith('EKU-')) {
      const eku = this.getEKU(evidenceId);
      if (eku.error) return eku;
      return {
        evidenceId: eku.id,
        type: "EKU",
        title: eku.title,
        claimId: eku.claimId,
        supportingEvidence: eku.supportingEvidence || [],
        counterEvidence: eku.counterEvidence || [],
        historicalEvidence: eku.historicalEvidence || [],
        corpusStats: eku.corpusStats,
        epistemicStatus: "CROSS_REPO_ABSTRACTION"
      };
    }

    if (evidenceId.startsWith('CLM-')) {
      const claim = this.getClaim(evidenceId);
      if (claim.error) return claim;
      return {
        evidenceId: claim.id,
        type: "CLAIM",
        title: claim.title,
        abstractionLevel: claim.abstractionLevel,
        supportingEvidence: claim.supportingEvidence || [],
        counterEvidence: claim.counterEvidence || [],
        epistemicStatus: claim.modelInferred ? "MODEL_INFERRED" : "SOURCE_OBSERVED"
      };
    }

    return { error: "NOT_FOUND", message: `Unknown evidence prefix in '${evidenceId}'` };
  }
  compareEngines(repoA, repoB, aspect = null) {
    this.load();
    const sumA = this.getDossierSummary(repoA);
    const sumB = this.getDossierSummary(repoB);

    // Look up claim matrix classifications for both
    const cleanA = repoA.toLowerCase().replace(/^(factory\/|.*\/\/)/, '').split('/').pop();
    const cleanB = repoB.toLowerCase().replace(/^(factory\/|.*\/\/)/, '').split('/').pop();

    const matrixComparison = [];
    for (const row of this.matrix) {
      const assessA = row.repositoryAssessments[cleanA];
      const assessB = row.repositoryAssessments[cleanB];
      if (assessA || assessB) {
        matrixComparison.push({
          ekuId: row.id,
          title: row.title,
          [cleanA]: assessA ? { class: assessA.class, rationale: assessA.rationale || assessA.notes } : "NOT_EVALUATED",
          [cleanB]: assessB ? { class: assessB.class, rationale: assessB.rationale || assessB.notes } : "NOT_EVALUATED"
        });
      }
    }

    return {
      engineA: {
        repo: repoA,
        primaryLanguage: sumA.primaryLanguage,
        storageBackend: sumA.storageBackend,
        keyMechanisms: sumA.keyMechanisms
      },
      engineB: {
        repo: repoB,
        primaryLanguage: sumB.primaryLanguage,
        storageBackend: sumB.storageBackend,
        keyMechanisms: sumB.keyMechanisms
      },
      claimMatrixComparison: matrixComparison.slice(0, 10),
      architecturalTradeoffs: [
        `${repoA} uses ${sumA.storageBackend} storage while ${repoB} uses ${sumB.storageBackend}.`,
        `Examine claim_matrix rows (e.g. EKU-QUEUE-001, EKU-QUEUE-002, EKU-QUEUE-015) for atomic dequeue and lease recovery differences.`
      ],
      epistemicStatus: 'CROSS_REPO_ABSTRACTION'
    };
  }

  getFailureChains({ repo, trigger, hasRegressionTest, limit = 5 } = {}) {
    this.load();
    limit = Math.min(Math.max(parseInt(limit) || 5, 1), 10);
    let items = this.historicalFailures || [];

    if (repo) {
      items = items.filter(h => h.repo && h.repo.toLowerCase().includes(repo.toLowerCase()));
    }
    if (trigger) {
      const tLower = trigger.toLowerCase();
      items = items.filter(h => `${h.trigger || ''} ${h.assumption || ''} ${h.observedFailure || ''}`.toLowerCase().includes(tLower));
    }
    if (typeof hasRegressionTest === 'boolean') {
      items = items.filter(h => Boolean(h.regressionTest) === hasRegressionTest);
    }

    const chains = items.slice(0, limit).map(h => {
      return {
        failureId: h.id,
        repository: h.repo,
        originalAssumption: h.assumption,
        triggeringCondition: h.trigger,
        observedFailure: h.observedFailure,
        fixCommitHash: h.fixCommit,
        changedFiles: h.changedFiles,
        regressionTestSignal: h.regressionTest || "EXPLICIT_TEST_GAP",
        generalizedConstraint: h.generalizedConstraint,
        provenance: {
          repository: h.repo,
          commitHash: h.fixCommit,
          commitVerifiedInGit: h.commitVerifiedInGit
        },
        epistemicStatus: 'HISTORY_SUPPORTED'
      };
    });

    return {
      totalFound: items.length,
      limit,
      failureChains: chains
    };
  }

  getImplementationEvidence({ ekuId, repo, mechanism, substrate, limit = 5 } = {}) {
    this.load();
    limit = Math.min(Math.max(parseInt(limit) || 5, 1), 10);

    const omittedRepoEkus = [];
    const validPackets = [];

    // Strictly derive bounded implementation packets from explicit Repo-Local EKUs
    (this.repoEkus || []).forEach(r => {
      const missingFields = [];
      if (!r.substrate) missingFields.push('substrate');
      if (!r.linkedDomainEkus || r.linkedDomainEkus.length === 0) missingFields.push('linkedDomainEkus');
      if (!r.linkedClaims || r.linkedClaims.length === 0) missingFields.push('linkedClaims');

      if (missingFields.length > 0) {
        const matchesRepo = !repo || (r.repository && r.repository.toLowerCase().includes(repo.toLowerCase()));
        if (matchesRepo) {
          omittedRepoEkus.push({
            repoEkuId: r.id || 'UNKNOWN',
            repository: r.repository || 'UNKNOWN',
            missingFields,
            hint: 'Populate explicit substrate, linkedDomainEkus, and linkedClaims in eku_store/repo_ekus/<repo>.json.'
          });
        }
        return;
      }

      validPackets.push({
        packetId: `IMPL-${r.repository.toUpperCase()}-${r.id.replace('REKU-', '')}`,
        repoEkuId: r.id,
        repository: r.repository,
        substrate: r.substrate,
        mechanism: r.mechanism,
        linkedEku: r.linkedDomainEkus[0],
        linkedDomainEkus: r.linkedDomainEkus,
        claimId: r.linkedClaims[0],
        linkedClaims: r.linkedClaims,
        commonKeywords: r.commonKeywords || [],
        uniqueKeywords: r.uniqueKeywords || [],
        keywordFacets: r.keywordFacets || {},
        localContext: r.localContext || '',
        sourceSnippets: r.sourceProvenance ? [
          {
            filePath: r.sourceProvenance.filePath,
            sourceUrl: this.buildGithubPermalink(r.repository, r.sourceProvenance.filePath, r.sourceProvenance.lineRange),
            rawSourceUrl: this.buildGithubUrl(r.repository, r.sourceProvenance.filePath, null, true),
            lines: r.sourceProvenance.queryOrCodeSnippet
          }
        ] : [],
        testReferences: r.testProvenance ? [
          `${r.testProvenance.testName} in ${r.testProvenance.filePath}`
        ] : [],
        applicabilityConstraints: r.applicabilityConditions || [],
        epistemicStatus: (r.epistemicLabels && r.epistemicLabels[0]) || 'SOURCE_OBSERVED'
      });
    });

    let filtered = validPackets;
    if (ekuId) {
      filtered = filtered.filter(p => p.linkedEku === ekuId || p.linkedDomainEkus.includes(ekuId));
    }
    if (repo) {
      filtered = filtered.filter(p => p.repository.toLowerCase().includes(repo.toLowerCase()));
    }
    if (substrate) {
      filtered = filtered.filter(p => p.substrate.toLowerCase().includes(substrate.toLowerCase()));
    }
    if (mechanism) {
      const mLower = mechanism.toLowerCase();
      filtered = filtered.filter(p =>
        p.mechanism.toLowerCase().includes(mLower) ||
        p.packetId.toLowerCase().includes(mLower) ||
        (p.commonKeywords && p.commonKeywords.some(k => k.toLowerCase().includes(mLower))) ||
        (p.uniqueKeywords && p.uniqueKeywords.some(k => k.toLowerCase().includes(mLower)))
      );
    }

    const response = {
      totalFound: filtered.length,
      limit,
      implementationPackets: filtered.slice(0, limit)
    };

    if (omittedRepoEkus.length > 0) {
      response.diagnostics = {
        omittedRepoEkus: omittedRepoEkus.slice(0, 10),
        reason: 'One or more matching RepoEKUs were omitted because they lack explicit substrate or domain linkage.'
      };
    }

    return response;
  }

  getAllKeywordGroups() {
    this.load();
    const groupMap = new Map();

    const addEntry = (key, groupType, repoEku, domainEku) => {
      if (!key) return;
      const norm = key.toLowerCase().trim();
      if (!groupMap.has(norm)) {
        groupMap.set(norm, {
          groupId: norm,
          groupType,
          keyword: key,
          participatingRepoEkus: [],
          participatingDomainEkus: [],
          repositories: new Set(),
          epistemicStatus: 'KEYWORD_GROUP_VIEW'
        });
      }
      const entry = groupMap.get(norm);
      if (repoEku && !entry.participatingRepoEkus.some(r => r.id === repoEku.id)) {
        entry.participatingRepoEkus.push({
          id: repoEku.id,
          repository: repoEku.repository,
          mechanism: repoEku.mechanism,
          claim: repoEku.claim,
          localContext: repoEku.localContext || '',
          applicabilityConditions: repoEku.applicabilityConditions || [],
          epistemicStatus: 'REPO_LOCAL',
          abstractionLevel: 'REPO_LOCAL'
        });
        entry.repositories.add(repoEku.repository);
      }
      if (domainEku && !entry.participatingDomainEkus.some(d => d.id === domainEku.id)) {
        entry.participatingDomainEkus.push({
          id: domainEku.id,
          title: domainEku.title,
          claimId: domainEku.claimId,
          abstractionLevel: 'DOMAIN_ABSTRACTION'
        });
      }
    };

    // 1. Process Repo EKUs
    for (const r of (this.repoEkus || [])) {
      for (const ck of (r.commonKeywords || [])) {
        addEntry(ck, 'COMMON_KEYWORD', r, null);
      }
      for (const uk of (r.uniqueKeywords || [])) {
        addEntry(uk, 'UNIQUE_KEYWORD', r, null);
      }
    }

    // 2. Process Domain EKUs
    for (const d of (this.ekus || [])) {
      for (const ck of (d.commonKeywordGroups || [])) {
        addEntry(ck, 'COMMON_KEYWORD', null, d);
      }
      for (const uk of (d.uniqueKeywordGroups || [])) {
        addEntry(uk, 'UNIQUE_KEYWORD', null, d);
      }
      for (const mf of (d.mechanismFamilies || [])) {
        addEntry(mf, 'MECHANISM_FAMILY', null, d);
      }
      for (const sf of (d.substrateFamilies || [])) {
        addEntry(sf, 'SUBSTRATE_FAMILY', null, d);
      }
    }

    const groups = Array.from(groupMap.values()).map(g => ({
      ...g,
      repositories: Array.from(g.repositories)
    }));

    return groups;
  }

  listKeywordGroups({ keyword, facet, commonOnly, uniqueOnly, page = 1, pageSize = 10, limit } = {}) {
    this.load();
    const effectiveLimit = limit !== undefined ? parseInt(limit) : parseInt(pageSize);
    const size = Math.min(Math.max(effectiveLimit || 10, 1), 20);
    const p = Math.max(parseInt(page) || 1, 1);
    let groups = this.getAllKeywordGroups();

    if (keyword) {
      const kLower = keyword.toLowerCase();
      groups = groups.filter(g => g.groupId.includes(kLower) || g.keyword.toLowerCase().includes(kLower));
    }
    if (facet) {
      groups = groups.filter(g => g.groupType === facet);
    }
    if (commonOnly) {
      groups = groups.filter(g => g.groupType === 'COMMON_KEYWORD');
    }
    if (uniqueOnly) {
      groups = groups.filter(g => g.groupType === 'UNIQUE_KEYWORD');
    }

    const totalFound = groups.length;
    const totalPages = Math.ceil(totalFound / size) || 1;
    const startIndex = (p - 1) * size;
    const paginated = groups.slice(startIndex, startIndex + size);

    return {
      totalFound,
      page: p,
      pageSize: size,
      totalPages,
      limit: size,
      keywordGroups: paginated,
      epistemicStatus: 'KEYWORD_GROUP_VIEW'
    };
  }

  getKeywordGroup({ groupId } = {}) {
    this.load();
    if (!groupId) {
      return { error: 'INVALID_REQUEST', message: 'groupId is required.' };
    }
    const norm = groupId.toLowerCase().trim();
    const groups = this.getAllKeywordGroups();
    const found = groups.find(g => g.groupId === norm || g.groupId.includes(norm));

    if (!found) {
      return {
        error: 'NOT_FOUND',
        message: `Keyword group '${groupId}' not found.`,
        availableGroups: groups.slice(0, 10).map(g => g.groupId)
      };
    }

    return {
      keywordGroup: found,
      epistemicStatus: 'KEYWORD_GROUP_VIEW'
    };
  }

  listRepoEkus({ repo, mechanism, objectType, page = 1, pageSize = 10, limit } = {}) {
    this.load();
    const effectiveLimit = limit !== undefined ? parseInt(limit) : parseInt(pageSize);
    const size = Math.min(Math.max(effectiveLimit || 10, 1), 10);
    const p = Math.max(parseInt(page) || 1, 1);
    let items = this.repoEkus || [];

    if (repo) {
      items = items.filter(r => r.repository.toLowerCase().includes(repo.toLowerCase()));
    }
    if (mechanism) {
      const mLower = mechanism.toLowerCase();
      items = items.filter(r =>
        (r.mechanism || '').toLowerCase().includes(mLower) ||
        (r.claim || '').toLowerCase().includes(mLower) ||
        (r.commonKeywords && r.commonKeywords.some(k => k.toLowerCase().includes(mLower))) ||
        (r.uniqueKeywords && r.uniqueKeywords.some(k => k.toLowerCase().includes(mLower)))
      );
    }
    if (objectType) {
      items = items.filter(r => r.objectType === objectType);
    }

    const totalFound = items.length;
    const totalPages = Math.ceil(totalFound / size) || 1;
    const startIndex = (p - 1) * size;
    const paginated = items.slice(startIndex, startIndex + size);

    return {
      totalFound,
      page: p,
      pageSize: size,
      totalPages,
      limit: size,
      repoEkus: paginated,
      epistemicStatus: 'REPO_LOCAL'
    };
  }

  getRepoEku({ repoEkuId } = {}) {
    this.load();
    const found = (this.repoEkus || []).find(r => r.id === repoEkuId);
    if (!found) {
      return {
        error: 'NOT_FOUND',
        message: `Repo EKU '${repoEkuId}' not found.`,
        availableIds: (this.repoEkus || []).map(r => r.id)
      };
    }
    return {
      repoEku: found,
      epistemicStatus: 'REPO_LOCAL'
    };
  }

  traceDomainEku({ ekuId } = {}) {
    this.load();
    const domainEku = (this.ekus || []).find(e => e.id === ekuId);
    if (!domainEku) {
      return {
        error: 'NOT_FOUND',
        message: `Domain EKU '${ekuId}' not found.`,
        availableIds: (this.ekus || []).map(e => e.id)
      };
    }

    const supportedRepoEkus = (this.repoEkus || []).filter(r =>
      (domainEku.supportedByRepoEkus || []).includes(r.id)
    );

    const alternativeRepoEkus = (this.repoEkus || []).filter(r =>
      (domainEku.alternativeMechanismRepoEkus || []).includes(r.id)
    );

    return {
      domainEkuId: domainEku.id,
      title: domainEku.title,
      claimId: domainEku.claimId,
      abstractionLevel: 'DOMAIN_ABSTRACTION',
      commonKeywordGroups: domainEku.commonKeywordGroups || [],
      uniqueKeywordGroups: domainEku.uniqueKeywordGroups || [],
      mechanismFamilies: domainEku.mechanismFamilies || [],
      substrateFamilies: domainEku.substrateFamilies || [],
      supportedByRepoEkus: supportedRepoEkus,
      alternativeMechanismRepoEkus: alternativeRepoEkus,
      rawObservationsCount: (domainEku.supportingEvidence || []).length,
      rawObservations: (domainEku.supportingEvidence || []),
      epistemicStatus: 'DOMAIN_ABSTRACTION'
    };
  }

  getDataQualityReport(options = {}) {
    this.load();
    const limit = Math.min(Math.max(parseInt(options.limit) || 20, 1), 50);
    const filterLayer = options.layer;

    const issues = [];
    const repoEkuIds = new Set((this.repoEkus || []).map(r => r.id));
    const allObsIds = new Set((this.observations || []).map(o => o.id));
    const allHistIds = new Set((this.historicalFailures || []).map(h => h.id));

    // 1. Audit Repo-Local EKUs
    if (!filterLayer || filterLayer === 'REPO_LOCAL') {
      for (const r of (this.repoEkus || [])) {
        const missing = [];
        if (!r.substrate) missing.push('substrate');
        if (!r.linkedDomainEkus || r.linkedDomainEkus.length === 0) missing.push('linkedDomainEkus');
        if (!r.linkedClaims || r.linkedClaims.length === 0) missing.push('linkedClaims');
        if (!r.localContext || r.localContext.length < 10) missing.push('localContext');
        if (!r.evidenceIds || r.evidenceIds.length === 0) missing.push('evidenceIds');

        if (missing.length > 0) {
          issues.push({
            affectedId: r.id || 'UNKNOWN',
            layer: 'REPO_LOCAL',
            repository: r.repository || 'unknown',
            issueCode: ISSUE.MISSING_EXPLICIT_FIELDS,
            missingOrStaleFields: missing,
            remediationHint: `Populate ${missing.join(', ')} in eku_store/repo_ekus/${r.repository || 'repo'}.json.`
          });
        }

        // Check cited evidence IDs
        const brokenEv = (r.evidenceIds || []).filter(eid => !allObsIds.has(eid) && !allHistIds.has(eid));
        if (brokenEv.length > 0) {
          issues.push({
            affectedId: r.id || 'UNKNOWN',
            layer: 'REPO_LOCAL',
            repository: r.repository || 'unknown',
            issueCode: ISSUE.BROKEN_EVIDENCE_LINK,
            missingOrStaleFields: brokenEv,
            remediationHint: `Ensure evidence IDs ${brokenEv.join(', ')} exist in observations.json or historical_failures.json.`
          });
        }

        // Provenance completeness
        const labels = r.epistemicLabels || [];
        if (labels.includes('SOURCE_OBSERVED') && (!r.sourceProvenance || !r.sourceProvenance.filePath || !r.sourceProvenance.queryOrCodeSnippet)) {
          issues.push({
            affectedId: r.id,
            layer: 'REPO_LOCAL',
            repository: r.repository || 'unknown',
            issueCode: ISSUE.MISSING_SOURCE_PROVENANCE,
            missingOrStaleFields: ['sourceProvenance.filePath', 'sourceProvenance.queryOrCodeSnippet'],
            remediationHint: 'Add relative source file path and query/code snippet.'
          });
        }
        if (labels.includes('TEST_OBSERVED') && (!r.testProvenance || !r.testProvenance.filePath || !r.testProvenance.testName)) {
          issues.push({
            affectedId: r.id,
            layer: 'REPO_LOCAL',
            repository: r.repository || 'unknown',
            issueCode: ISSUE.MISSING_TEST_PROVENANCE,
            missingOrStaleFields: ['testProvenance.filePath', 'testProvenance.testName'],
            remediationHint: 'Add relative test file path and test suite/function name.'
          });
        }
      }
    }

    // 2. Audit Domain EKUs
    if (!filterLayer || filterLayer === 'DOMAIN_ABSTRACTION') {
      for (const d of (this.ekus || [])) {
        const brokenSup = (d.supportedByRepoEkus || []).filter(id => !repoEkuIds.has(id));
        if (brokenSup.length > 0) {
          issues.push({
            affectedId: d.id,
            layer: 'DOMAIN_ABSTRACTION',
            issueCode: ISSUE.BROKEN_SUPPORT_LINK,
            missingOrStaleFields: brokenSup,
            remediationHint: `Fix unknown supportedByRepoEkus ${brokenSup.join(', ')} in eku_store/synthesized_queue_ekus.json.`
          });
        }

        const brokenAlt = (d.alternativeMechanismRepoEkus || []).filter(id => !repoEkuIds.has(id));
        if (brokenAlt.length > 0) {
          issues.push({
            affectedId: d.id,
            layer: 'DOMAIN_ABSTRACTION',
            issueCode: ISSUE.BROKEN_ALTERNATIVE_LINK,
            missingOrStaleFields: brokenAlt,
            remediationHint: `Fix unknown alternativeMechanismRepoEkus ${brokenAlt.join(', ')} in eku_store/synthesized_queue_ekus.json.`
          });
        }

        const brokenCe = (d.counterexampleRepoEkus || []).filter(id => !repoEkuIds.has(id));
        if (brokenCe.length > 0) {
          issues.push({
            affectedId: d.id,
            layer: 'DOMAIN_ABSTRACTION',
            issueCode: ISSUE.BROKEN_COUNTEREXAMPLE_LINK,
            missingOrStaleFields: brokenCe,
            remediationHint: `Fix unknown counterexampleRepoEkus ${brokenCe.join(', ')} in eku_store/synthesized_queue_ekus.json.`
          });
        }

        const brokenNa = (d.notApplicableRepoEkus || []).filter(id => !repoEkuIds.has(id));
        if (brokenNa.length > 0) {
          issues.push({
            affectedId: d.id,
            layer: 'DOMAIN_ABSTRACTION',
            issueCode: ISSUE.BROKEN_NOT_APPLICABLE_LINK,
            missingOrStaleFields: brokenNa,
            remediationHint: `Fix unknown notApplicableRepoEkus ${brokenNa.join(', ')} in eku_store/synthesized_queue_ekus.json.`
          });
        }

        const hasFalsification = Boolean(d.counterexampleAuditNote) ||
                                 ((d.counterexampleRepoEkus || []).length > 0) ||
                                 ((d.notApplicableRepoEkus || []).length > 0);
        if (!hasFalsification) {
          issues.push({
            affectedId: d.id,
            layer: 'DOMAIN_ABSTRACTION',
            issueCode: ISSUE.MISSING_FALSIFICATION_AUDIT,
            missingOrStaleFields: ['counterexampleAuditNote', 'counterexampleRepoEkus', 'notApplicableRepoEkus'],
            remediationHint: 'Perform falsification audit: classify represented repos as SUPPORTS, ALTERNATIVE, COUNTEREXAMPLE, or NOT_APPLICABLE.'
          });
        }
      }
    }

    return {
      totalIssuesFound: issues.length,
      limit,
      storeHealthStatus: issues.length === 0 ? 'HEALTHY' : 'NEEDS_REMEDIATION',
      diagnostics: issues.slice(0, limit),
      auditedLayers: filterLayer ? [filterLayer] : ['REPO_LOCAL', 'DOMAIN_ABSTRACTION']
    };
  }

}
