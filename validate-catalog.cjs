const fs = require('fs');
const d = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const editions = d('data/editions.json').editions;
const authors = d('data/authors.json').authors;
const venues = d('data/venues.json').venues;
const exhibitions = d('data/exhibitions.json').exhibitions;

const editionIds = new Set(editions.map(e => e.id));
const authorIds = new Set(authors.map(a => a.id));
const venueIds = new Set(venues.map(v => v.id));
const exhIds = new Set();

let errors = [];

for (const exh of exhibitions) {
  if (exhIds.has(exh.id)) errors.push(`Duplicate exhibition id: ${exh.id}`);
  exhIds.add(exh.id);
  if (!editionIds.has(exh.editionId)) errors.push(`${exh.id}: unknown editionId ${exh.editionId}`);
  for (const aid of exh.authorIds || []) {
    if (!authorIds.has(aid)) errors.push(`${exh.id}: unknown authorId ${aid}`);
  }
  if (exh.venueId && !venueIds.has(exh.venueId)) errors.push(`${exh.id}: unknown venueId ${exh.venueId}`);
  for (const vid of exh.venueCandidates || []) {
    if (!venueIds.has(vid)) errors.push(`${exh.id}: unknown venueCandidate ${vid}`);
  }
  if (exh.venueClaims) {
    for (const c of exh.venueClaims) {
      if (!venueIds.has(c.venueId)) errors.push(`${exh.id}: unknown venueClaims.venueId ${c.venueId}`);
    }
  }
  // Coherència de dates
  if (exh.startDate && exh.endDate && exh.startDate > exh.endDate) {
    errors.push(`${exh.id}: startDate > endDate`);
  }
}

// Duplicate ids elsewhere
const dupCheck = (list, label) => {
  const seen = new Set();
  for (const item of list) {
    if (seen.has(item.id)) errors.push(`Duplicate ${label} id: ${item.id}`);
    seen.add(item.id);
  }
};
dupCheck(editions, 'edition');
dupCheck(authors, 'author');
dupCheck(venues, 'venue');

// Coordinates sanity (within rough Perpignan bounding box)
for (const v of venues) {
  if (v.coordinates) {
    const { lat, lng } = v.coordinates;
    if (lat < 42.5 || lat > 42.9 || lng < 2.7 || lng > 3.1) {
      errors.push(`${v.id}: coordinates look outside Perpignan (${lat}, ${lng})`);
    }
  }
}

console.log(`Exhibitions: ${exhibitions.length} (VISA: ${exhibitions.filter(e=>e.circuit==='VISA').length}, OFF: ${exhibitions.filter(e=>e.circuit==='OFF').length})`);
console.log(`Venues: ${venues.length}, Authors: ${authors.length}, Editions: ${editions.length}`);

if (errors.length) {
  console.log(`\n${errors.length} ERRORS:`);
  errors.forEach(e => console.log(' - ' + e));
  process.exit(1);
} else {
  console.log('\nOK: cap error d\'integritat referencial.');
}
