export function rankEvidence(text, store, options = {}) {
  store.load();
  const lowerText = text.toLowerCase();
  const tokens = lowerText.split(/\W+/).filter(t => t.length >= 3);

  const scoredEkus = (store.ekus || []).map(eku => {
    let lexicalScore = 0;
    const matchedFields = [];
    const matchedTerms = [];

    const titleLower = (eku.title || '').toLowerCase();
    const problemLower = (eku.problem || '').toLowerCase();
    const invariantLower = (eku.behavioralInvariant || '').toLowerCase();
    const designLower = (eku.designContract || '').toLowerCase();
    const applicabilityLower = (eku.applicabilityConstraints || []).join(' ').toLowerCase();
    const verificationLower = (eku.verificationContract || []).join(' ').toLowerCase();

    for (const token of tokens) {
      const singularToken = token.endsWith('s') ? token.slice(0, -1) : token;
      let matchedInEku = false;

      if (titleLower.includes(token) || titleLower.includes(singularToken)) {
        lexicalScore += 4;
        matchedFields.push('title');
        matchedInEku = true;
      }
      if (invariantLower.includes(token) || invariantLower.includes(singularToken)) {
        lexicalScore += 3;
        matchedFields.push('behavioralInvariant');
        matchedInEku = true;
      }
      if (problemLower.includes(token) || problemLower.includes(singularToken)) {
        lexicalScore += 2;
        matchedFields.push('problem');
        matchedInEku = true;
      }
      if (designLower.includes(token) || designLower.includes(singularToken)) {
        lexicalScore += 2;
        matchedFields.push('designContract');
        matchedInEku = true;
      }
      if (applicabilityLower.includes(token) || applicabilityLower.includes(singularToken)) {
        lexicalScore += 1;
        matchedFields.push('applicabilityConstraints');
        matchedInEku = true;
      }
      if (verificationLower.includes(token) || verificationLower.includes(singularToken)) {
        lexicalScore += 2;
        matchedFields.push('verificationContract');
        matchedInEku = true;
      }

      if (matchedInEku) {
        matchedTerms.push(token);
      }
    }

    // Evidence Strength Feature (derived from corpus evaluation matrix)
    const corpusSupports = (eku.corpusStats && eku.corpusStats.supports) || 0;
    const evidenceSupportScore = Math.min(corpusSupports, 10);

    // Historical Evidence Linkage Feature
    const historicalCount = (eku.historicalEvidence && eku.historicalEvidence.length) || 0;
    const historicalScore = historicalCount * 3;

    // Verification Depth Feature
    const verificationDepthScore = ((eku.verificationContract && eku.verificationContract.length) || 0) * 2;

    const totalScore = lexicalScore + evidenceSupportScore + historicalScore + verificationDepthScore;

    return {
      eku,
      totalScore,
      scoreExplanation: {
        totalScore,
        lexicalScore,
        evidenceSupportScore,
        historicalScore,
        verificationDepthScore,
        matchedTerms: Array.from(new Set(matchedTerms)),
        matchedFields: Array.from(new Set(matchedFields)),
        corpusSupportCount: corpusSupports,
        hasCounterexamples: Boolean(eku.counterEvidence && eku.counterEvidence.length > 0)
      }
    };
  }).filter(s => s.lexicalScore > 0 || s.totalScore > 10).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return a.eku.id.localeCompare(b.eku.id); // Deterministic tie-breaker
  });

  return scoredEkus;
}
