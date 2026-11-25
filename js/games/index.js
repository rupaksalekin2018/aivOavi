// Game registry. Every game shares one interface:
//   { id, domain, icon, mount(el, ctx) -> cleanup }   and calls ctx.onDone({ score: 0..100, accuracy, timeMs })
import memoryMatch from './memory-match.js';
import patternEcho from './pattern-echo.js';
import wordGarden from './word-garden.js';
import numberPath from './number-path.js';
import oddOneOut from './odd-one-out.js';
import clockSetter from './clock-setter.js';
import todayQuiz from './today-quiz.js';
import faceName from './face-name.js';

export const GAMES = [memoryMatch, patternEcho, wordGarden, numberPath, oddOneOut, clockSetter, todayQuiz, faceName];
export const GAME_IDS = GAMES.map((g) => g.id);
export const gameById = (id) => GAMES.find((g) => g.id === id);
export const DOMAINS = [...new Set(GAMES.map((g) => g.domain))];
