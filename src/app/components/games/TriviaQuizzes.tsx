import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { describeAgentVoice, resultVoice, triviaHostLine } from './agentFlavor';

type TriviaQuestion = {
  category: string;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
};

const QUESTION_TIME = 30;
const QUESTIONS_PER_SESSION = 10;

const CATEGORIES = [
  'Science', 'Engineering', 'Music', 'Geography', 'History',
  'Math', 'Language', 'Computing', 'Biology', 'Art', 'Business', 'Logic',
] as const;

const ALL_TRIVIA: TriviaQuestion[] = [
  // ── Science ──────────────────────────────────────────────────────────────
  {
    category: 'Science',
    prompt: 'What is the approximate half-life of Carbon-14?',
    options: ['570 years', '5,730 years', '57,300 years', '5,730,000 years'],
    answer: '5,730 years',
    explanation: 'Carbon-14 decays at a rate of roughly half every 5,730 years, making it useful for dating organic material up to ~50,000 years old.',
  },
  {
    category: 'Science',
    prompt: 'Which subatomic particle has no electric charge?',
    options: ['Proton', 'Electron', 'Neutron', 'Positron'],
    answer: 'Neutron',
    explanation: 'Neutrons carry no electric charge. Protons are positive, electrons are negative, and positrons are the antimatter equivalent of electrons.',
  },
  {
    category: 'Science',
    prompt: 'At standard temperature and pressure, what is the speed of sound in dry air?',
    options: ['~343 m/s', '~299 m/s', '~440 m/s', '~1,484 m/s'],
    answer: '~343 m/s',
    explanation: 'Sound travels at approximately 343 m/s (1,235 km/h) in dry air at 20°C. In water it travels much faster — roughly 1,484 m/s.',
  },
  {
    category: 'Science',
    prompt: 'Which element has the highest electronegativity on the Pauling scale?',
    options: ['Oxygen', 'Chlorine', 'Nitrogen', 'Fluorine'],
    answer: 'Fluorine',
    explanation: 'Fluorine has an electronegativity of 3.98 on the Pauling scale — the highest of any element — making it an extremely reactive nonmetal.',
  },
  {
    category: 'Science',
    prompt: 'What phenomenon causes the sky to appear blue?',
    options: ['Diffraction', 'Refraction', 'Rayleigh scattering', 'Mie scattering'],
    answer: 'Rayleigh scattering',
    explanation: 'Rayleigh scattering causes shorter (blue) wavelengths of sunlight to scatter more than longer wavelengths, giving the sky its blue color.',
  },

  // ── Engineering ──────────────────────────────────────────────────────────
  {
    category: 'Engineering',
    prompt: 'In materials science, what term describes a material\'s ability to deform plastically before fracturing?',
    options: ['Brittleness', 'Hardness', 'Ductility', 'Elasticity'],
    answer: 'Ductility',
    explanation: 'Ductility is the capacity of a material (often a metal) to undergo significant plastic deformation before rupture — unlike brittleness, where fracture occurs with little deformation.',
  },
  {
    category: 'Engineering',
    prompt: 'What does PID stand for in a PID controller?',
    options: ['Proportional-Integral-Derivative', 'Phase-Inverse-Differential', 'Pulse-Interval-Delay', 'Precision-Input-Damping'],
    answer: 'Proportional-Integral-Derivative',
    explanation: 'A PID controller uses Proportional, Integral, and Derivative terms to compute a correction to minimize the error between desired and measured output.',
  },
  {
    category: 'Engineering',
    prompt: 'Which type of bridge uses cables anchored at each end to carry the deck\'s load?',
    options: ['Arch bridge', 'Truss bridge', 'Suspension bridge', 'Cable-stayed bridge'],
    answer: 'Suspension bridge',
    explanation: 'In a suspension bridge, the deck hangs from vertical suspenders attached to main cables that run over towers and are anchored at both ends — unlike cable-stayed bridges where cables attach directly to towers.',
  },
  {
    category: 'Engineering',
    prompt: 'What is the primary purpose of a Wheatstone bridge circuit?',
    options: ['Amplify voltage signals', 'Measure unknown electrical resistance', 'Filter AC noise', 'Step down transformer output'],
    answer: 'Measure unknown electrical resistance',
    explanation: 'A Wheatstone bridge is a circuit that precisely measures an unknown resistance by balancing two legs of a bridge circuit against a known resistance.',
  },
  {
    category: 'Engineering',
    prompt: 'In structural engineering, what is the "moment of inertia" used to predict?',
    options: ['Thermal expansion under load', 'Beam deflection and bending resistance', 'Material yield strength', 'Torsional shear stress only'],
    answer: 'Beam deflection and bending resistance',
    explanation: 'The second moment of area (often called moment of inertia in structures) quantifies a cross-section\'s resistance to bending and is central to beam deflection calculations.',
  },

  // ── Music ─────────────────────────────────────────────────────────────────
  {
    category: 'Music',
    prompt: 'In Western music theory, how many semitones are in a perfect fifth?',
    options: ['5', '6', '7', '8'],
    answer: '7',
    explanation: 'A perfect fifth spans 7 semitones (e.g., C to G). It is one of the most consonant intervals and is foundational to the circle of fifths.',
  },
  {
    category: 'Music',
    prompt: 'Which composer wrote "The Well-Tempered Clavier"?',
    options: ['Wolfgang Amadeus Mozart', 'Ludwig van Beethoven', 'Johann Sebastian Bach', 'George Frideric Handel'],
    answer: 'Johann Sebastian Bach',
    explanation: 'Bach composed The Well-Tempered Clavier (Books I and II) as a set of preludes and fugues in all 24 major and minor keys, demonstrating equal temperament tuning.',
  },
  {
    category: 'Music',
    prompt: 'What time signature is most commonly associated with a waltz?',
    options: ['2/4', '3/4', '4/4', '6/8'],
    answer: '3/4',
    explanation: 'A waltz is in 3/4 time — three quarter-note beats per measure — giving it the characteristic ONE-two-three feel.',
  },
  {
    category: 'Music',
    prompt: 'Which genre directly influenced the development of rock and roll in the 1940s–50s?',
    options: ['Jazz only', 'Classical and opera', 'Rhythm and blues', 'Country and western exclusively'],
    answer: 'Rhythm and blues',
    explanation: 'Rock and roll emerged primarily from rhythm and blues (R&B), blending its electric guitar and backbeat with country influences. R&B itself evolved from blues, jazz, and gospel.',
  },
  {
    category: 'Music',
    prompt: 'What does "da capo" instruct a performer to do?',
    options: ['Slow down gradually', 'Repeat from the beginning', 'Jump to the coda', 'Play more softly'],
    answer: 'Repeat from the beginning',
    explanation: '"Da capo" is Italian for "from the head" — it instructs the performer to return to the beginning of the piece or section.',
  },

  // ── Geography ────────────────────────────────────────────────────────────
  {
    category: 'Geography',
    prompt: 'Which country contains the largest portion of the Amazon rainforest?',
    options: ['Colombia', 'Peru', 'Venezuela', 'Brazil'],
    answer: 'Brazil',
    explanation: 'Brazil holds approximately 60% of the Amazon rainforest, making it by far the largest national share of this critical ecosystem.',
  },
  {
    category: 'Geography',
    prompt: 'What is the deepest lake in the world by maximum depth?',
    options: ['Lake Superior', 'Lake Titicaca', 'Lake Baikal', 'Caspian Sea'],
    answer: 'Lake Baikal',
    explanation: 'Lake Baikal in Siberia reaches a maximum depth of about 1,642 m (5,387 ft), making it the world\'s deepest lake. It also contains roughly 20% of Earth\'s unfrozen surface fresh water.',
  },
  {
    category: 'Geography',
    prompt: 'Which country shares land borders with the most other countries?',
    options: ['Russia', 'Brazil', 'China', 'Germany'],
    answer: 'China',
    explanation: 'China borders 14 countries: Russia, Mongolia, Kazakhstan, Kyrgyzstan, Tajikistan, Afghanistan, Pakistan, India, Nepal, Bhutan, Myanmar, Laos, Vietnam, and North Korea — tied with Russia for the most land neighbors.',
  },
  {
    category: 'Geography',
    prompt: 'The Strait of Malacca connects which two bodies of water?',
    options: ['Red Sea and Arabian Sea', 'Andaman Sea and South China Sea', 'Bay of Bengal and Gulf of Oman', 'Java Sea and Coral Sea'],
    answer: 'Andaman Sea and South China Sea',
    explanation: 'The Strait of Malacca runs between the Malay Peninsula and Sumatra, connecting the Andaman Sea (Indian Ocean) to the South China Sea — one of the world\'s most strategically critical shipping lanes.',
  },
  {
    category: 'Geography',
    prompt: 'Which African country has the highest population?',
    options: ['Ethiopia', 'South Africa', 'Egypt', 'Nigeria'],
    answer: 'Nigeria',
    explanation: 'Nigeria surpassed 200 million people and remains Africa\'s most populous nation, ahead of Ethiopia and Egypt.',
  },

  // ── History ───────────────────────────────────────────────────────────────
  {
    category: 'History',
    prompt: 'In what year did the Berlin Wall fall?',
    options: ['1987', '1988', '1989', '1991'],
    answer: '1989',
    explanation: 'The Berlin Wall fell on 9 November 1989 following a miscommunicated East German announcement that border crossings were immediately open.',
  },
  {
    category: 'History',
    prompt: 'The Treaty of Westphalia (1648) ended which major European conflict?',
    options: ['The Hundred Years\' War', 'The Seven Years\' War', 'The Thirty Years\' War', 'The War of Spanish Succession'],
    answer: 'The Thirty Years\' War',
    explanation: 'The Peace of Westphalia ended the Thirty Years\' War (1618–1648) and is often cited as the foundation of the modern nation-state system and the principle of state sovereignty.',
  },
  {
    category: 'History',
    prompt: 'Which empire controlled the largest contiguous land territory in history?',
    options: ['British Empire', 'Mongol Empire', 'Russian Empire', 'Ottoman Empire'],
    answer: 'Mongol Empire',
    explanation: 'At its peak in the 13th century, the Mongol Empire covered roughly 24 million km² of contiguous land — the largest in history. The British Empire was larger in total area but not contiguous.',
  },
  {
    category: 'History',
    prompt: 'What was the name of the economic policy in the USSR from 1921 that permitted limited private enterprise?',
    options: ['Glasnost', 'Perestroika', 'New Economic Policy', 'War Communism'],
    answer: 'New Economic Policy',
    explanation: 'Lenin introduced the NEP in 1921 as a temporary retreat from pure communist economics, allowing small-scale private trade and farming to stabilize the Soviet economy after the civil war.',
  },
  {
    category: 'History',
    prompt: 'In which city was Archduke Franz Ferdinand assassinated in 1914?',
    options: ['Vienna', 'Prague', 'Sarajevo', 'Belgrade'],
    answer: 'Sarajevo',
    explanation: 'Archduke Franz Ferdinand of Austria-Hungary was assassinated in Sarajevo on 28 June 1914 by Gavrilo Princip, triggering the chain of events that led to World War I.',
  },

  // ── Math ──────────────────────────────────────────────────────────────────
  {
    category: 'Math',
    prompt: 'What is the sum of the interior angles of a hexagon?',
    options: ['540°', '720°', '900°', '1,080°'],
    answer: '720°',
    explanation: 'The sum of interior angles of an n-sided polygon is (n−2) × 180°. For a hexagon: (6−2) × 180° = 720°.',
  },
  {
    category: 'Math',
    prompt: 'What is the derivative of sin(x)?',
    options: ['−sin(x)', 'cos(x)', '−cos(x)', 'tan(x)'],
    answer: 'cos(x)',
    explanation: 'd/dx [sin(x)] = cos(x). This is a foundational result of differential calculus and follows from the limit definition of a derivative.',
  },
  {
    category: 'Math',
    prompt: 'Which of these numbers is irrational?',
    options: ['√4', '√9', '√2', '√16'],
    answer: '√2',
    explanation: '√2 ≈ 1.41421... cannot be expressed as a ratio of two integers, making it irrational. The others are perfect squares (2, 3, 4) and therefore rational.',
  },
  {
    category: 'Math',
    prompt: 'How many prime numbers exist between 1 and 20?',
    options: ['6', '7', '8', '9'],
    answer: '8',
    explanation: 'The primes between 1 and 20 are: 2, 3, 5, 7, 11, 13, 17, 19 — a total of 8.',
  },
  {
    category: 'Math',
    prompt: 'If a population grows at 7% per year, approximately how many years does it take to double?',
    options: ['7 years', '10 years', '14 years', '20 years'],
    answer: '10 years',
    explanation: 'The Rule of 72 says doubling time ≈ 72 ÷ growth rate. 72 ÷ 7 ≈ 10.3 years.',
  },

  // ── Language ──────────────────────────────────────────────────────────────
  {
    category: 'Language',
    prompt: 'What linguistic term describes a word that sounds like what it represents (e.g., "buzz", "sizzle")?',
    options: ['Alliteration', 'Onomatopoeia', 'Synecdoche', 'Metonymy'],
    answer: 'Onomatopoeia',
    explanation: 'Onomatopoeia refers to words whose pronunciation imitates the sound they describe — like "buzz," "hiss," or "crackle."',
  },
  {
    category: 'Language',
    prompt: 'Which language has the most native speakers worldwide as of 2024?',
    options: ['English', 'Hindi', 'Mandarin Chinese', 'Spanish'],
    answer: 'Mandarin Chinese',
    explanation: 'Mandarin Chinese has roughly 920 million native speakers, making it the most spoken language by native speakers. English leads in total speakers (native + second language).',
  },
  {
    category: 'Language',
    prompt: 'What is the term for a word that is spelled the same forwards and backwards?',
    options: ['Anagram', 'Homophone', 'Palindrome', 'Portmanteau'],
    answer: 'Palindrome',
    explanation: 'A palindrome reads the same in both directions — examples include "racecar," "level," and "madam."',
  },
  {
    category: 'Language',
    prompt: 'A "portmanteau" word is formed by:',
    options: ['Reversing two words', 'Blending parts of two words into one', 'Repeating a root word', 'Deriving from Latin directly'],
    answer: 'Blending parts of two words into one',
    explanation: '"Portmanteau" blending combines two words — e.g., "brunch" (breakfast + lunch) or "smog" (smoke + fog). The term was popularized by Lewis Carroll.',
  },
  {
    category: 'Language',
    prompt: 'In grammar, what is a "dangling modifier"?',
    options: ['A noun used as a verb', 'A modifier that does not clearly modify the intended subject', 'An adverb placed incorrectly after a verb', 'A pronoun without a clear antecedent'],
    answer: 'A modifier that does not clearly modify the intended subject',
    explanation: 'A dangling modifier is a word or phrase that modifies an unintended or absent subject — e.g., "Running to the bus, the rain started." (The rain was not running.)',
  },

  // ── Computing ─────────────────────────────────────────────────────────────
  {
    category: 'Computing',
    prompt: 'In Big-O notation, what is the average-case time complexity of quicksort?',
    options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
    answer: 'O(n log n)',
    explanation: 'Quicksort has an average-case complexity of O(n log n). Its worst case is O(n²), which occurs with poor pivot selection, e.g., already-sorted input with the first element as pivot.',
  },
  {
    category: 'Computing',
    prompt: 'What does the acronym "ACID" stand for in database transactions?',
    options: ['Atomicity, Consistency, Isolation, Durability', 'Accuracy, Compression, Integrity, Distribution', 'Access, Control, Indexing, Data', 'Atomicity, Concurrency, Integration, Durability'],
    answer: 'Atomicity, Consistency, Isolation, Durability',
    explanation: 'ACID is the set of properties that guarantee reliable database transactions: Atomicity (all or nothing), Consistency (valid state), Isolation (concurrent transactions don\'t interfere), Durability (persisted after commit).',
  },
  {
    category: 'Computing',
    prompt: 'In computer architecture, what does "von Neumann bottleneck" refer to?',
    options: ['Heat buildup in multi-core CPUs', 'Throughput limit caused by shared data and instruction bus', 'GPU memory bandwidth cap', 'Cache coherence latency in NUMA systems'],
    answer: 'Throughput limit caused by shared data and instruction bus',
    explanation: 'The von Neumann bottleneck describes the limited throughput between the CPU and memory when instructions and data share the same bus — a fundamental constraint of the classic von Neumann architecture.',
  },
  {
    category: 'Computing',
    prompt: 'Which sorting algorithm is stable and has O(n log n) worst-case complexity?',
    options: ['Quicksort', 'Heapsort', 'Merge sort', 'Selection sort'],
    answer: 'Merge sort',
    explanation: 'Merge sort is stable (preserves relative order of equal elements) and guarantees O(n log n) in all cases. Heapsort is O(n log n) worst-case but not stable; quicksort is O(n²) worst-case.',
  },
  {
    category: 'Computing',
    prompt: 'What is the result of a bitwise XOR operation on 0b1010 and 0b1100?',
    options: ['0b1110', '0b0110', '0b1000', '0b0010'],
    answer: '0b0110',
    explanation: 'XOR compares bits: 1010 XOR 1100 = 0110. Each bit is 1 only when the two input bits differ: 1⊕1=0, 0⊕1=1, 1⊕0=1, 0⊕0=0.',
  },

  // ── Biology ───────────────────────────────────────────────────────────────
  {
    category: 'Biology',
    prompt: 'Which organelle is responsible for producing ATP via cellular respiration?',
    options: ['Ribosome', 'Golgi apparatus', 'Mitochondria', 'Endoplasmic reticulum'],
    answer: 'Mitochondria',
    explanation: 'Mitochondria generate most of the cell\'s ATP through oxidative phosphorylation — hence the epithet "powerhouse of the cell."',
  },
  {
    category: 'Biology',
    prompt: 'During meiosis, how many genetically unique cells are produced from one parent cell?',
    options: ['2', '4', '8', '16'],
    answer: '4',
    explanation: 'Meiosis undergoes two rounds of division, producing 4 haploid daughter cells, each genetically unique due to crossing-over and independent assortment.',
  },
  {
    category: 'Biology',
    prompt: 'What type of bond holds the two strands of DNA together?',
    options: ['Covalent bonds', 'Ionic bonds', 'Hydrogen bonds', 'Peptide bonds'],
    answer: 'Hydrogen bonds',
    explanation: 'The two complementary strands of DNA are held together by hydrogen bonds between base pairs: adenine (A) pairs with thymine (T) via 2 H-bonds, and guanine (G) pairs with cytosine (C) via 3.',
  },
  {
    category: 'Biology',
    prompt: 'Which blood type is the universal donor for red blood cell transfusions?',
    options: ['Type A positive', 'Type O negative', 'Type AB positive', 'Type B negative'],
    answer: 'Type O negative',
    explanation: 'Type O negative red blood cells lack A, B, and Rh antigens on their surface, so they can be given to patients of any blood type without triggering an immune reaction.',
  },
  {
    category: 'Biology',
    prompt: 'CRISPR-Cas9 functions primarily as a:',
    options: ['Protein synthesizer', 'DNA repair enzyme only', 'Programmable DNA-cutting tool', 'RNA transcription factor'],
    answer: 'Programmable DNA-cutting tool',
    explanation: 'CRISPR-Cas9 uses a guide RNA to direct the Cas9 endonuclease to a specific DNA sequence, where it makes a precise double-strand cut — enabling targeted gene editing.',
  },

  // ── Art ────────────────────────────────────────────────────────────────────
  {
    category: 'Art',
    prompt: 'Which art movement did Salvador Dalí primarily belong to?',
    options: ['Cubism', 'Surrealism', 'Dadaism', 'Abstract Expressionism'],
    answer: 'Surrealism',
    explanation: 'Salvador Dalí is one of the most famous Surrealists, known for paintings like "The Persistence of Memory" that explore dreamlike, irrational imagery.',
  },
  {
    category: 'Art',
    prompt: 'The technique of painting on wet plaster so pigment is absorbed into the wall is called:',
    options: ['Fresco', 'Tempera', 'Encaustic', 'Gouache'],
    answer: 'Fresco',
    explanation: 'In buon fresco, pigments are applied to freshly laid (wet) lime plaster, binding permanently as the plaster sets. Michelangelo\'s Sistine Chapel ceiling is a famous example.',
  },
  {
    category: 'Art',
    prompt: 'In which century did the Impressionist movement originate in France?',
    options: ['17th', '18th', '19th', '20th'],
    answer: '19th',
    explanation: 'Impressionism emerged in France during the 1860s–1870s. The name came from Claude Monet\'s 1872 painting "Impression, Sunrise," which critics initially used as a dismissive label.',
  },
  {
    category: 'Art',
    prompt: 'The "Golden Ratio" (~1.618) is often used in design because:',
    options: ['It guarantees perfect symmetry', 'It is divisible by all integers', 'Its proportions are considered especially aesthetically pleasing', 'It was mandated by the Renaissance Academy'],
    answer: 'Its proportions are considered especially aesthetically pleasing',
    explanation: 'The Golden Ratio (~φ = 1.618) appears frequently in art, architecture, and nature. Its proportions are widely regarded as aesthetically harmonious, though its prevalence in art is sometimes overstated.',
  },
  {
    category: 'Art',
    prompt: 'Which Japanese art form involves the arrangement of cut flowers according to specific principles?',
    options: ['Origami', 'Ikebana', 'Sumi-e', 'Kintsugi'],
    answer: 'Ikebana',
    explanation: 'Ikebana is the Japanese art of flower arrangement. Unlike Western bouquets, it emphasizes minimalism, asymmetry, and the relationship between stems, leaves, and flowers.',
  },

  // ── Business ──────────────────────────────────────────────────────────────
  {
    category: 'Business',
    prompt: 'In economics, what is "opportunity cost"?',
    options: ['The cost of raw materials for a product', 'The value of the next best alternative foregone', 'The fixed overhead of running a business', 'The marginal cost of producing one more unit'],
    answer: 'The value of the next best alternative foregone',
    explanation: 'Opportunity cost is the benefit sacrificed by choosing one option over the next best alternative — a key concept in rational decision-making and resource allocation.',
  },
  {
    category: 'Business',
    prompt: 'Which financial ratio measures a company\'s ability to pay short-term obligations using its most liquid assets?',
    options: ['Debt-to-equity ratio', 'Current ratio', 'Quick ratio', 'Price-to-earnings ratio'],
    answer: 'Quick ratio',
    explanation: 'The quick ratio (acid-test ratio) = (cash + short-term investments + receivables) ÷ current liabilities. It excludes inventory, making it a stricter liquidity measure than the current ratio.',
  },
  {
    category: 'Business',
    prompt: 'What does "EBITDA" stand for?',
    options: ['Earnings Before Interest, Tax, Depreciation, and Amortization', 'Estimated Business Income Through Direct Allocation', 'Equity Balance Including Total Debt and Assets', 'Enterprise Budget Index for Tax and Dividend Assessment'],
    answer: 'Earnings Before Interest, Tax, Depreciation, and Amortization',
    explanation: 'EBITDA is a common proxy for operating cash flow, removing accounting non-cash charges and financing costs to make it easier to compare companies across capital structures.',
  },
  {
    category: 'Business',
    prompt: 'In Porter\'s Five Forces, which force specifically analyzes the threat of customers switching to substitutes?',
    options: ['Bargaining power of suppliers', 'Threat of new entrants', 'Bargaining power of buyers', 'Threat of substitute products or services'],
    answer: 'Threat of substitute products or services',
    explanation: 'Porter\'s threat of substitutes examines how easily customers can switch to a different product that performs a similar function — affecting price sensitivity and industry profitability.',
  },
  {
    category: 'Business',
    prompt: 'What is "venture capital" primarily used to fund?',
    options: ['Government infrastructure projects', 'Early-stage, high-growth-potential startups', 'Public company buybacks', 'Municipal bonds'],
    answer: 'Early-stage, high-growth-potential startups',
    explanation: 'Venture capital is private equity financing provided to early-stage companies with high growth potential in exchange for equity — typically tech or biotech startups.',
  },

  // ── Logic ─────────────────────────────────────────────────────────────────
  {
    category: 'Logic',
    prompt: 'If all roses are flowers and some flowers fade quickly, which conclusion MUST be true?',
    options: ['All roses fade quickly', 'Some roses may fade quickly', 'No roses fade quickly', 'All flowers are roses'],
    answer: 'Some roses may fade quickly',
    explanation: 'We know roses are a subset of flowers, and some flowers fade quickly. Those fading flowers may or may not be roses — so "some roses may fade quickly" is possible but not certain. Nothing else is logically guaranteed.',
  },
  {
    category: 'Logic',
    prompt: 'A clock shows 3:15. What is the angle between the hour and minute hands?',
    options: ['0°', '7.5°', '15°', '22.5°'],
    answer: '7.5°',
    explanation: 'At 3:15 the minute hand is at 90°. The hour hand moves 0.5° per minute; at 3:15 it is at 90° + 7.5° = 97.5°. The angle between them is 97.5° − 90° = 7.5°.',
  },
  {
    category: 'Logic',
    prompt: 'You have two ropes, each burns in exactly 60 minutes (non-uniformly). How do you measure 45 minutes?',
    options: ['Burn both from one end simultaneously', 'Light one from both ends; when it burns out, light the second from both ends', 'Cut one rope in half and burn both halves', 'Burn one fully, then time the second by feel'],
    answer: 'Light one from both ends; when it burns out, light the second from both ends',
    explanation: 'Light rope A from both ends — it burns out in 30 minutes. Simultaneously light rope B from one end. When A is gone, light B\'s other end too; it will burn out in 15 more minutes. Total: 45 minutes.',
  },
  {
    category: 'Logic',
    prompt: 'In a valid syllogism: "All mammals are warm-blooded. A whale is a mammal." What must follow?',
    options: ['All warm-blooded animals are whales', 'A whale is warm-blooded', 'Warm-blooded animals are mammals', 'Some mammals are not whales'],
    answer: 'A whale is warm-blooded',
    explanation: 'This is a classic modus barbara syllogism. If all mammals are warm-blooded, and a whale is a mammal, it necessarily follows that a whale is warm-blooded.',
  },
  {
    category: 'Logic',
    prompt: 'A bat and a ball cost $1.10 total. The bat costs $1.00 more than the ball. How much does the ball cost?',
    options: ['$0.10', '$0.15', '$0.05', '$0.20'],
    answer: '$0.05',
    explanation: 'If the ball costs x, the bat costs x + $1.00. Together: x + (x + $1.00) = $1.10 → 2x = $0.10 → x = $0.05. The intuitive answer of $0.10 is wrong — the bat would then cost $1.10, totaling $1.20.',
  },
];

function buildSession(category: string): TriviaQuestion[] {
  const pool = category === 'All Categories'
    ? ALL_TRIVIA
    : ALL_TRIVIA.filter(q => q.category === category);
  return [...pool].sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_SESSION);
}

export function TriviaQuizzes() {
  const { currentTheme: t, chatAgent } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [sessionQuestions, setSessionQuestions] = useState<TriviaQuestion[]>([]);
  const [phase, setPhase] = useState<'category-select' | 'quiz' | 'finished'>('category-select');
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [timedOut, setTimedOut] = useState(false);
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, { correct: number; total: number }>>({});

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const question = useMemo(
    () => (sessionQuestions.length > 0 ? sessionQuestions[index] : null),
    [index, sessionQuestions],
  );

  const voice = useMemo(() => describeAgentVoice(chatAgent), [chatAgent]);
  const hostPrompt = useMemo(
    () => (question ? triviaHostLine(chatAgent, question.prompt) : ''),
    [chatAgent, question],
  );

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleTimeout = useCallback(() => {
    stopTimer();
    setTimedOut(true);
    setShowResult(true);
    setStreak(0);
  }, [stopTimer]);

  // Start timer when a new question appears during the quiz
  useEffect(() => {
    if (phase !== 'quiz') return;
    setTimeLeft(QUESTION_TIME);
    setTimedOut(false);
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => stopTimer();
  }, [index, phase, stopTimer, handleTimeout]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const startQuiz = (category: string) => {
    const questions = buildSession(category);
    setSessionQuestions(questions);
    setSelectedCategory(category);
    setIndex(0);
    setScore(0);
    setStreak(0);
    setSelected(null);
    setShowResult(false);
    setTimedOut(false);
    setCategoryBreakdown({});
    setPhase('quiz');
  };

  const chooseOption = (option: string) => {
    if (showResult) return;
    stopTimer();
    setSelected(option);
    setShowResult(true);

    const isCorrect = option === (question as TriviaQuestion).answer;
    if (isCorrect) {
      setScore(v => v + 1);
      setStreak(v => v + 1);
    } else {
      setStreak(0);
    }

    const cat = (question as TriviaQuestion).category;
    setCategoryBreakdown(prev => ({
      ...prev,
      [cat]: {
        correct: (prev[cat]?.correct ?? 0) + (isCorrect ? 1 : 0),
        total: (prev[cat]?.total ?? 0) + 1,
      },
    }));
  };

  const nextQuestion = () => {
    if (index < sessionQuestions.length - 1) {
      setIndex(v => v + 1);
      setSelected(null);
      setShowResult(false);
      setTimedOut(false);
    } else {
      stopTimer();
      setPhase('finished');
    }
  };

  const restartQuiz = () => {
    stopTimer();
    setPhase('category-select');
  };

  const timerPct = (timeLeft / QUESTION_TIME) * 100;
  const timerColor = timerPct > 60 ? '#22c55e' : timerPct > 30 ? '#f59e0b' : '#ef4444';

  const performanceLabel = (() => {
    if (!sessionQuestions.length) return '';
    const ratio = score / sessionQuestions.length;
    if (ratio >= 0.9) return 'Outstanding';
    if (ratio >= 0.7) return 'Strong';
    if (ratio >= 0.5) return 'Solid';
    return 'Needs another pass';
  })();

  // ── Phase: category selector ────────────────────────────────────────────
  if (phase === 'category-select') {
    return (
      <div className="space-y-4">
        <div>
          <div className="text-sm" style={{ color: t.text }}>Trivia Quizzes</div>
          <div className="text-xs mt-1" style={{ color: t.textMuted }}>{voice.intro}</div>
        </div>

        <div className="rounded-2xl p-5 space-y-3" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
          <div className="text-xs uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>
            Choose a category — 10 questions, 30 seconds each
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {(['All Categories', ...CATEGORIES] as string[]).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => startQuiz(cat)}
                className="px-3 py-1.5 rounded-xl text-xs transition-all"
                style={{
                  background: cat === selectedCategory ? t.accent : t.surface3,
                  color: cat === selectedCategory ? t.bg : t.text,
                  border: `1px solid ${cat === selectedCategory ? t.accent : t.border}`,
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: finished ──────────────────────────────────────────────────────
  if (phase === 'finished') {
    const breakdownEntries = Object.entries(categoryBreakdown);
    return (
      <div className="space-y-4">
        <div className="rounded-2xl p-5" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
          <div className="text-xs uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>Quiz Complete</div>
          <div className="text-2xl mt-2 font-medium" style={{ color: t.text }}>
            {score}/{sessionQuestions.length} correct
          </div>
          <div className="text-sm mt-1" style={{ color: t.accent }}>{performanceLabel}</div>
          <p className="text-sm mt-3" style={{ color: t.textMuted, lineHeight: 1.7 }}>
            {resultVoice(chatAgent, score >= Math.ceil(sessionQuestions.length * 0.6))}
          </p>

          {breakdownEntries.length > 1 && (
            <div className="mt-4 space-y-2">
              <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>Category breakdown</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {breakdownEntries.map(([cat, { correct, total }]) => (
                  <div
                    key={cat}
                    className="px-2.5 py-1.5 rounded-lg text-xs"
                    style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.text }}
                  >
                    {cat}: {correct}/{total}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => startQuiz(selectedCategory)}
            className="px-4 py-2 rounded-xl text-sm"
            style={{ background: t.accent, color: t.bg }}
          >
            Play again
          </button>
          <button
            type="button"
            onClick={restartQuiz}
            className="px-4 py-2 rounded-xl text-sm"
            style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.text }}
          >
            Change category
          </button>
        </div>
      </div>
    );
  }

  // ── Phase: quiz ──────────────────────────────────────────────────────────
  if (!question) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm" style={{ color: t.text }}>Trivia Quizzes</div>
          <div className="text-xs mt-0.5" style={{ color: t.textMuted }}>{voice.intro}</div>
        </div>
        <div className="text-right">
          <div className="text-xs px-3 py-1.5 rounded-lg" style={{ background: t.surface3, color: t.textMuted }}>
            {score}/{index + (showResult ? 1 : 0)} correct
          </div>
          {streak >= 2 && (
            <div className="text-xs mt-1" style={{ color: t.accent }}>
              {'\uD83D\uDD25'} {streak} streak
            </div>
          )}
        </div>
      </div>

      {/* Timer bar */}
      <div>
        <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: t.surface3 }}>
          <div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{
              width: `${timerPct}%`,
              background: timerColor,
              transition: 'width 1s linear, background 0.5s ease',
            }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1" style={{ color: t.textMuted }}>
          <span>{showResult ? '—' : `${timeLeft}s remaining`}</span>
          <span>Q{index + 1} of {sessionQuestions.length}</span>
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-2xl p-5" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>
            Question {index + 1}
          </div>
          <div className="text-[11px] px-2 py-1 rounded-full" style={{ background: t.surface3, color: t.textMuted }}>
            {question.category}
          </div>
        </div>
        <div className="text-base mt-3 leading-relaxed" style={{ color: t.text }}>{hostPrompt}</div>
        {timedOut && (
          <div className="text-xs mt-2" style={{ color: '#ef4444' }}>Time's up — no answer recorded.</div>
        )}
      </div>

      {/* Options */}
      <div className="grid gap-3 md:grid-cols-2">
        {question.options.map(option => {
          const isCorrect = showResult && option === question.answer;
          const isWrong = showResult && selected === option && option !== question.answer;
          return (
            <button
              key={option}
              type="button"
              onClick={() => chooseOption(option)}
              disabled={showResult}
              className="rounded-2xl p-4 text-left text-sm transition-all"
              style={{
                background: isCorrect
                  ? 'rgba(34,197,94,0.14)'
                  : isWrong
                  ? 'rgba(239,68,68,0.14)'
                  : t.surface2,
                border: `1px solid ${
                  isCorrect
                    ? 'rgba(34,197,94,0.4)'
                    : isWrong
                    ? 'rgba(239,68,68,0.4)'
                    : t.border
                }`,
                color: t.text,
                cursor: showResult ? 'default' : 'pointer',
              }}
            >
              {option}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {showResult && (
        <div
          className="rounded-2xl p-4 text-sm"
          style={{ background: `${t.accent}10`, border: `1px solid ${t.border}`, color: t.text, lineHeight: 1.7 }}
        >
          {!timedOut && resultVoice(chatAgent, selected === question.answer)}{' '}
          {question.explanation}
        </div>
      )}

      {/* Next button */}
      {showResult && (
        <button
          type="button"
          onClick={nextQuestion}
          className="px-4 py-2 rounded-xl text-sm"
          style={{ background: t.accent, color: t.bg }}
        >
          {index < sessionQuestions.length - 1 ? 'Next question' : 'Finish quiz'}
        </button>
      )}
    </div>
  );
}
