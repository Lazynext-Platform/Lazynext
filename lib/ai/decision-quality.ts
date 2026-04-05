interface DecisionInput {
  question: string
  resolution?: string | null
  rationale?: string | null
  optionsConsidered?: string[]
  decisionType?: string | null
}

export function computeDecisionQualityScore(decision: DecisionInput): number {
  let score = 0

  // Category 1: Completeness of options (0–25 pts)
  const optionCount = decision.optionsConsidered?.length || 0
  score += Math.min(optionCount * 8, 25)

  // Category 2: Rationale quality (0–25 pts)
  const rationaleLength = decision.rationale?.trim().length || 0
  if (rationaleLength > 200) score += 25
  else if (rationaleLength > 100) score += 18
  else if (rationaleLength > 50) score += 10
  else if (rationaleLength > 0) score += 5

  // Category 3: Question specificity (0–25 pts)
  const questionLength = decision.question?.trim().length || 0
  if (questionLength > 40) score += 25
  else if (questionLength > 20) score += 15
  else if (questionLength > 10) score += 8

  // Category 4: Reversibility acknowledgment (0–25 pts)
  if (decision.decisionType === 'reversible' || decision.decisionType === 'irreversible') score += 15
  if (decision.rationale?.toLowerCase().includes('revers')) score += 10
  else if (decision.decisionType === 'experimental') score += 25

  return Math.min(score, 100)
}
