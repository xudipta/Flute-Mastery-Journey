/* Alankar data: the practice patterns and the scales they can be played in.

   A pattern is a "kernel": scale degrees (0 = Sa, 1 = the next note up ...) that are repeated starting on each
   degree in turn, going up the scale and then (mirrored) back down. For example the kernel [0, 1, 2] gives
   Sa Re Ga, Re Ga Ma, Ga Ma Pa ... and, coming down, Sa' Ni Dha, Ni Dha Pa ...
     id, name   shown on the card
     kernel     degrees of one group; the first is always 0
     step       how many degrees the start moves between groups (default 1)
     about      one line for the card
   A scale is the list of swars in one octave, from Sa up to the upper Sa, in the sargam notation used by ragas.js
   (S r R g G m M P d D n N, a trailing ' is the upper octave). `raga` names the RAGA_NOTATION entry it must match.
   To add a pattern or a scale, add one line to the lists below; tools/check-alankar.js checks every combination.

   ALANKAR.build(pattern, scale) -> { degrees, tokens, ascGroups, descGroups, top, resolved }
     ascGroups / descGroups   the groups as degree lists (descending = ascending mirrored: degree d becomes top - d)
     degrees / tokens         the whole round, ascending then descending, as degrees and as swar tokens
     resolved                 true if a final Sa was added so the round always ends on Sa */
(function (root) {
  'use strict';

  const SCALES = [
    { id: 'shuddha', name: 'Shuddha (Bilawal)', tokens: "S R G m P D N S'" },
    { id: 'kalyan', name: 'Kalyan (Yaman)', tokens: "S R G M P D N S'" },
    { id: 'kafi', name: 'Kafi', tokens: "S R g m P D n S'", raga: 'Kafi' },
    { id: 'asavari', name: 'Asavari', tokens: "S R g m P d n S'" },
    { id: 'khamaj', name: 'Khamaj', tokens: "S R G m P D n S'" },
    { id: 'bhairav', name: 'Bhairav', tokens: "S r G m P d N S'", raga: 'Bhairav' },
    { id: 'bhoopali', name: 'Bhoopali (5 notes)', tokens: "S R G P D S'", raga: 'Bhoopali' },
    { id: 'durga', name: 'Durga (5 notes)', tokens: "S R m P D S'", raga: 'Durga' },
    { id: 'hamsadhwani', name: 'Hamsadhwani (5 notes)', tokens: "S R G P N S'", raga: 'Hamsadhwani' },
    { id: 'malkauns', name: 'Malkauns (5 notes)', tokens: "S g m d n S'", raga: 'Malkauns' }
  ];

  const PATTERNS = [
    { id: 'sapaat', name: 'Straight run', kernel: [0], about: 'One note at a time, up and down.' },
    { id: 'double', name: 'Each note twice', kernel: [0, 0], about: 'Sa Sa, Re Re, Ga Ga …' },
    { id: 'pairs', name: 'Pairs', kernel: [0, 1], step: 2, about: 'Sa Re, Ga Ma, Pa Dha …' },
    { id: 'threes', name: 'Groups of three', kernel: [0, 1, 2], about: 'Sa Re Ga, Re Ga Ma, Ga Ma Pa …' },
    { id: 'fours', name: 'Groups of four', kernel: [0, 1, 2, 3], about: 'Sa Re Ga Ma, Re Ga Ma Pa …' },
    { id: 'fours2', name: 'Fours, two at a time', kernel: [0, 1, 2, 3], step: 2, about: 'Sa Re Ga Ma, Ga Ma Pa Dha …' },
    { id: 'fives', name: 'Groups of five', kernel: [0, 1, 2, 3, 4], about: 'Sa Re Ga Ma Pa, Re Ga Ma Pa Dha …' },
    { id: 'back2', name: 'Step and return', kernel: [0, 1, 0], about: 'Sa Re Sa, Re Ga Re, Ga Ma Ga …' },
    { id: 'back3', name: 'Three up, one back', kernel: [0, 1, 2, 1], about: 'Sa Re Ga Re, Re Ga Ma Ga …' },
    { id: 'arch', name: 'Up and back', kernel: [0, 1, 2, 1, 0], about: 'Sa Re Ga Re Sa, Re Ga Ma Ga Re …' },
    { id: 'longarch', name: 'Long arch', kernel: [0, 1, 2, 3, 2, 1, 0], about: 'Sa Re Ga Ma Ga Re Sa, Re Ga Ma Pa Ma Ga Re …' },
    { id: 'skip', name: 'Skip a note', kernel: [0, 2], about: 'Sa Ga, Re Ma, Ga Pa …' },
    { id: 'skipfill', name: 'Skip and fill', kernel: [0, 2, 1], about: 'Sa Ga Re, Re Ma Ga, Ga Pa Ma …' },
    { id: 'skipback', name: 'Third and return', kernel: [0, 2, 0], about: 'Sa Ga Sa, Re Ma Re, Ga Pa Ga …' },
    { id: 'cross', name: 'Criss-cross', kernel: [0, 2, 1, 3], about: 'Sa Ga Re Ma, Re Ma Ga Pa …' },
    { id: 'cross2', name: 'Criss-cross, other way', kernel: [0, 1, 3, 2], about: 'Sa Re Ma Ga, Re Ga Pa Ma …' },
    { id: 'fourth', name: 'Leap of a fourth', kernel: [0, 3], about: 'Sa Ma, Re Pa, Ga Dha …' },
    { id: 'fifth', name: 'Leap of a fifth', kernel: [0, 4], about: 'Sa Pa, Re Dha, Ga Ni …' }
  ];

  function build(pattern, scale) {
    const top = scale.tokens.split(/\s+/).length - 1, kernel = pattern.kernel, step = pattern.step || 1;
    const span = Math.max.apply(null, kernel), ascGroups = [];
    for (let s = 0; s + span <= top; s += step) ascGroups.push(kernel.map((k) => s + k));
    const descGroups = ascGroups.map((g) => g.map((d) => top - d));
    const degrees = [].concat.apply([], ascGroups).concat([].concat.apply([], descGroups));
    const resolved = degrees[degrees.length - 1] !== 0;
    if (resolved) { degrees.push(0); descGroups.push([0]); }
    const toks = scale.tokens.split(/\s+/);
    return { degrees, tokens: degrees.map((d) => toks[d]), ascGroups, descGroups, top, resolved };
  }

  const api = { scales: SCALES, patterns: PATTERNS, build };
  root.ALANKAR = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
