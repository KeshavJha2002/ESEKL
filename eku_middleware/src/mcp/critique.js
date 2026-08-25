import { rankEvidence } from './ranking.js';

export function registerCritiqueTools(server, store) {
  // 1. compare_design_against_evidence
  server.registerTool('compare_design_against_evidence', {
    description: 'Analyzes a proposed architecture against empirical invariants, returning matched evidence, missing invariants, matched failure chains, not-applicable constraints, and what not to promise.',
    parameters: {
      type: 'object',
      properties: {
        proposedDesign: {
          type: 'string',
          description: 'Description or specification of the proposed system architecture'
        },
        options: {
          type: 'object',
          properties: {
            strictness: { type: 'string', enum: ['advisory', 'strict'], default: 'strict' }
          }
        }
      },
      required: ['proposedDesign']
    },
    handler: async ({ proposedDesign, options = {} }) => {
      store.load();
      const designText = String(proposedDesign || '');
      const lowerDesign = designText.toLowerCase();

      // Multi-factor feature ranking
      const ranked = rankEvidence(designText, store, options);
      const topMatches = ranked.slice(0, 5);

      const matchingEkus = topMatches.map(r => r.eku.id);
      const missingInvariants = [];
      const counterexamples = [];
      const matchedFailureChains = [];
      const whatNotToPromise = [];
      const notApplicableConstraints = [];

      // Extract matching failure chains from store based on top matched terms
      const allTokens = topMatches.flatMap(r => r.scoreExplanation.matchedTerms || []);
      const tokenQuery = Array.from(new Set(allTokens)).slice(0, 3).join(' ');
      const failChainsRes = store.getFailureChains({ trigger: tokenQuery, limit: 3 });
      if (failChainsRes && failChainsRes.failureChains) {
        for (const fc of failChainsRes.failureChains) {
          matchedFailureChains.push({
            failureId: fc.failureId,
            repository: fc.repository,
            originalAssumption: fc.originalAssumption,
            triggeringCondition: fc.triggeringCondition,
            observedFailure: fc.observedFailure,
            generalizedConstraint: fc.generalizedConstraint,
            regressionTestSignal: fc.regressionTestSignal,
            epistemicStatus: 'HISTORY_SUPPORTED'
          });
        }
      }

      // Check missing invariants and not-applicable constraints based on matched EKUs
      for (const item of topMatches) {
        const eku = item.eku;
        const invLower = (eku.behavioralInvariant || '').toLowerCase();

        // Dynamically check if design text addresses the EKU invariant
        const isCovered = invLower.split(/\W+/).filter(w => w.length > 5).some(w => lowerDesign.includes(w));

        if (!isCovered) {
          missingInvariants.push({
            ekuId: eku.id,
            title: eku.title,
            behavioralInvariant: eku.behavioralInvariant,
            designContract: eku.designContract,
            evidenceScore: item.totalScore,
            scoreExplanation: item.scoreExplanation
          });
        }

        // Dynamically populate whatNotToPromise and counterexamples from matched EKU data
        if (eku.counterEvidence && eku.counterEvidence.length > 0) {
          for (const ce of eku.counterEvidence) {
            counterexamples.push({
              repo: ce.repo,
              reason: ce.reason,
              linkedEku: eku.id
            });
          }
        }

        // Dynamic what-not-to-promise derived from EKU contracts
        if (eku.id === 'EKU-QUEUE-015' && (lowerDesign.includes('payment') || lowerDesign.includes('settlement') || lowerDesign.includes('webhook') || lowerDesign.includes('third-party') || lowerDesign.includes('network'))) {
          whatNotToPromise.push('Never promise true "exactly-once" delivery over external third-party networks without storage token fencing and partner idempotency keys.');
        } else if (eku.id === 'EKU-QUEUE-015' && !lowerDesign.includes('payment') && !lowerDesign.includes('settlement') && !lowerDesign.includes('webhook')) {
          notApplicableConstraints.push({
            constraint: 'Two-phase financial settlement outbox tables are NOT_APPLICABLE for ephemeral / idempotent non-monetary projections.',
            derivedFromEku: 'EKU-QUEUE-015',
            status: 'NOT_APPLICABLE'
          });
        }

        if (eku.id === 'EKU-QUEUE-018' && (lowerDesign.includes('poison') || lowerDesign.includes('corrupt') || lowerDesign.includes('crash') || lowerDesign.includes('cron') || lowerDesign.includes('retry'))) {
          whatNotToPromise.push('Never promise infinite retries for unparseable poison inputs; unhandled process failures must quarantine with diagnostics.');
        }

        if (eku.id === 'EKU-QUEUE-019' && (lowerDesign.includes('burst') || lowerDesign.includes('surge') || lowerDesign.includes('quota') || lowerDesign.includes('overload') || lowerDesign.includes('database'))) {
          whatNotToPromise.push('Never promise unbounded in-memory queuing during storage saturation; excess ingest must fail fast with HTTP 429/503.');
        }
      }

      // Find supporting Repo EKUs and Implementation Packets for matched EKUs
      const supportingRepoEkus = [];
      for (const eid of matchingEkus) {
        const domainEku = (store.ekus || []).find(e => e.id === eid);
        if (domainEku) {
          const supported = (store.repoEkus || []).filter(r => (domainEku.supportedByRepoEkus || []).includes(r.id));
          for (const s of supported) {
            if (!supportingRepoEkus.some(x => x.id === s.id)) {
              supportingRepoEkus.push({
                id: s.id,
                repository: s.repository,
                mechanism: s.mechanism,
                claim: s.claim,
                epistemicStatus: 'REPO_LOCAL'
              });
            }
          }
        }
      }

      const implRes = store.getImplementationEvidence({ limit: 5 });
      const matchedImplementationPackets = (implRes.implementationPackets || []).filter(p =>
        matchingEkus.includes(p.linkedEku) || lowerDesign.includes((p.mechanism || '').toLowerCase())
      );

      return {
        matchingEkus,
        supportingRepoEkus,
        matchedImplementationPackets,
        missingInvariants,
        matchedFailureChains,
        counterexamples,
        notApplicableConstraints,
        whatNotToPromise,
        rankingDetails: topMatches.map(r => ({
          ekuId: r.eku.id,
          title: r.eku.title,
          totalScore: r.totalScore,
          scoreExplanation: r.scoreExplanation
        }))
      };
    }
  });

  // 2. generate_verification_plan
  server.registerTool('generate_verification_plan', {
    description: 'Generates concrete adversarial test suites dynamically selected and ranked from empirical evidence and failure chains.',
    parameters: {
      type: 'object',
      properties: {
        requirementOrDesign: {
          type: 'string',
          description: 'System requirement or architecture under test'
        },
        options: {
          type: 'object',
          properties: {
            includeAdversarialScenarios: { type: 'boolean', default: true }
          }
        }
      },
      required: ['requirementOrDesign']
    },
    handler: async ({ requirementOrDesign, options = {} }) => {
      store.load();
      const text = String(requirementOrDesign || '');
      const ranked = rankEvidence(text, store, options);
      const topMatches = ranked.slice(0, 4);

      const verificationSuites = topMatches.map(r => {
        const eku = r.eku;
        return {
          suiteName: `Adversarial Verification: ${eku.title}`,
          targetEku: eku.id,
          motivatedByEku: eku.id,
          selectionRationale: `Matched on fields [${(r.scoreExplanation.matchedFields || []).join(', ')}] with total score ${r.totalScore}`,
          scenarios: (eku.verificationContract || []).map(vc => ({
            scenario: vc,
            method: 'Deterministic Fault Injection / Model Check',
            expectedPassCriteria: 'Invariant holds without state corruption or double-execution'
          }))
        };
      });

      return {
        totalSuites: verificationSuites.length,
        verificationSuites,
        testSuites: verificationSuites,
        epistemicStatus: 'SYNTHESIZED_ADVICE'
      };
    }
  });
}
