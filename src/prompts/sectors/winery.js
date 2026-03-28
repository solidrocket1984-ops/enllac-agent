function getWineryPrompt() {
  return [
    'Sector specialization: winery and wine tourism.',
    'Focus on matching people count and preferences to winery experiences.',
    'Use winery context fields and available experiences to recommend best fit.'
  ].join('\n');
}

module.exports = { getWineryPrompt };
