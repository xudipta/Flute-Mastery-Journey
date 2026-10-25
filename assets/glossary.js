/* Glossary: powers the dotted-underline tooltips and the Glossary section.
   Each entry: [term, plural/alias patterns (optional), definition, auto]. auto:false = listed only. */
(function (root) {
  'use strict';
  const G = [
    ['alankar', ['alankars', 'palta', 'paltas'], 'A pattern of notes practised up and down the scale, such as Sa Re Ga, Re Ga Ma. Also called a palta.'],
    ['alaap', ['alap'], 'The slow, free-time opening of a raga with no rhythm, where the raga is unfolded one swar at a time.'],
    ['andolan', [], 'A slow, wide oscillation on a swar, a hallmark of ragas like Darbari Kanada.'],
    ['aroha', [], 'The ascending order of swars in a raga.'],
    ['avaroha', [], 'The descending order of swars in a raga.'],
    ['cents', ['cent'], 'A hundredth of a semitone, used to say how sharp or flat a note is. Within about 10 cents sounds in tune.'],
    ['bandish', ['bandishes'], 'A fixed composition in a raga, set to a taal.'],
    ['bansuri', [], 'The bamboo side-blown flute of Indian classical music. It has six finger holes.'],
    ['bol', ['bols'], 'A spoken syllable for a tabla stroke, such as Dha, Dhin, Na or Tin.'],
    ['gamak', [], 'A heavy, weighty oscillation on a swar. On the bansuri it is made with pulses of breath.'],
    ['gat', ['gats'], 'A fixed instrumental composition set to a taal, played after the alaap.'],
    ['jhala', [], 'The fast, rhythmic climax of an instrumental performance, often using double tonguing.'],
    ['kan', [], 'A grace note touched briefly just before the main swar.'],
    ['khali', [], 'The "empty" beat of a taal, shown with a wave of the hand and marked ○.'],
    ['komal', [], 'A lowered (flat) swar. Re, Ga, Dha and Ni can be komal.'],
    ['laya', [], 'Tempo. Vilambit is slow, madhya is medium and drut is fast.'],
    ['meend', [], 'A smooth glide from one swar to another with no break in the sound.'],
    ['murki', ['murkis'], 'A quick, delicate ornament of a few fast notes around a swar.'],
    ['pakad', [], 'The signature phrase that identifies a raga.'],
    ['pranayama', [], 'Yogic breath control practice. Musicians use it to build breath capacity and steadiness.'],
    ['riyaaz', [], 'Daily disciplined practice.'],
    ['sadhana', [], 'Devoted, disciplined practice. In "sur sadhana" it means practising long, steady notes.'],
    ['sam', [], 'The first beat of a taal cycle and the point where every phrase lands. Marked ✕.'],
    ['samvadi', [], 'The second most important swar of a raga.'],
    ['saptak', ['saptaks'], 'An octave. Mandra is the lower octave, madhya the middle and taar the upper.'],
    ['sargam', [], 'The note names Sa Re Ga Ma Pa Dha Ni, like do re mi.'],
    ['shuddha', [], 'A natural, unaltered swar.'],
    ['swar', ['swars', 'swaras', 'sur', 'surs'], 'A musical note. The seven swars are Sa Re Ga Ma Pa Dha Ni.'],
    ['taal', ['taals', 'tal'], 'A rhythmic cycle with a fixed number of beats, such as Teentaal (16) or Dadra (6).'],
    ['taan', ['taans'], 'A fast run of swars played in quick succession.'],
    ['tali', [], 'A clap beat in a taal.'],
    ['tanpura', [], 'The drone instrument. Its strings (Pa, Sa, Sa, low Sa) sound continuously to give you the tonic.'],
    ['thaat', ['thaats'], 'A parent scale from which ragas are grouped. Bhatkhande\'s system has ten.'],
    ['theka', [], 'The basic pattern of tabla bols that defines a taal.'],
    ['tihai', [], 'A phrase repeated three times so that it ends exactly on sam.'],
    ['tivra', [], 'A raised (sharp) swar. Only Ma can be tivra.'],
    ['vadi', [], 'The most important swar of a raga, which is emphasised and lingered on.'],
    ['vibhag', ['vibhags'], 'A section of a taal, for example 4+4+4+4 in Teentaal.']
  ];
  // Listed in the glossary page but not underlined in running text.
  const EXTRA = [
    ['Sa', 'The tonic: the home note every raga is built around. On the bansuri it is the note with holes 1, 2 and 3 covered.'],
    ['Raga', 'A framework of swars, characteristic phrases and mood, traditionally linked to a time of day or season.']
  ];
  const entries = G.map(([term, alias, def]) => ({ term, alias, def }));
  root.GLOSSARY = {
    entries,
    extra: EXTRA,
    lookup(word) {
      const w = word.toLowerCase();
      return entries.find((e) => e.term === w || e.alias.includes(w)) || null;
    }
  };
})(window);
