const title = 'Наруто';
const release = { name: { main: 'Наруто Ураганные хроники', english: 'Naruto: Shippuuden' } };

const simplifyTitle = (value) => {
  return typeof value === 'string'
    ? value.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/gi, ' ').trim()
    : '';
};

const getAniLibriaScore = (release, title) => {
  const query = simplifyTitle(title);
  if (!query) return 0;

  const names = [
    simplifyTitle(release.name?.main),
    simplifyTitle(release.name?.english),
    simplifyTitle(release.name?.alternative),
  ].filter(Boolean);

  if (names.some(name => name === query)) return 100;
  // This is too aggressive: query="наруто" is included in "наруто ураганные хроники", returns 70!
  if (names.some(name => name.includes(query) || query.includes(name))) return 70;

  return 0; // Simplified for test
};

console.log(getAniLibriaScore(release, title));
