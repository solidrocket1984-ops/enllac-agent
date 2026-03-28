const supported = new Set([
  'generic',
  'winery',
  'clinic',
  'professional_services',
  'local_business',
  'hospitality',
  'tourism',
  'ecommerce_retail'
]);

function resolveSector({ requestSector, inferredSector, envDefault }) {
  const candidates = [requestSector, inferredSector, envDefault, 'generic']
    .map((v) => (v || '').toLowerCase().trim())
    .filter(Boolean);

  for (const c of candidates) {
    if (supported.has(c)) return c;
  }
  return 'generic';
}

module.exports = { resolveSector, supportedSectors: [...supported] };
