export function describeSimilarity(score: number): string {
  if (score >= 0.9) {
    return "near-twin groove";
  }

  if (score >= 0.82) {
    return "safe transition";
  }

  if (score >= 0.74) {
    return "interesting left turn";
  }

  return "outlier move";
}
