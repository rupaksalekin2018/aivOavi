// Every piece of text the app shows lives here, so a new language = a new file like this one.
// Writing rules (ASD-STE100 Simplified Technical English):
//  - Instructions: one action per sentence, imperative ("Touch…"), max 20 words.
//  - Descriptions: max 25 words, simple present tense, active voice.
//  - No contractions ("do not", not "don't"). One word = one meaning ("touch" for every press on the screen).
//  - Technical names of this app (Avi, PIN, check-up, XP, Easy mode, game names) are kept as names.
export const strings = {
  appName: 'aivOavi',
  home: 'Home', back: 'Back', readAloud: 'Read', next: 'Next', start: 'Start', done: 'Done',
  continue: 'Continue', skip: 'Skip', cancel: 'Cancel', yes: 'Yes', no: 'No', ok: 'OK', close: 'Close',
  check: 'Check', tryAgain: 'Try the next one.', wellDone: 'Well done!', great: 'Good work!',
  loading: 'Please wait…',

  // Start / end markers
  startHere: 'Start here',
  endToday: 'You are finished for today.',
  endTodaySub: 'You can close aivOavi now. Come back tomorrow.',
  lastStep: 'This is the last step.',
  obStep: 'Step {n} of {total}',

  // Lock
  lockTitle: 'Welcome back!', lockBody: 'Type your PIN to open aivOavi.',
  lockWrong: 'The PIN is not correct. Try again.',
  lockWait: 'Too many tries. Wait {s} seconds.',
  unlock: 'Open',
  pinForgot: 'Your data is locked with your PIN. If you forget the PIN, you must delete all data and start again.',
  pinForgotBtn: 'I forgot the PIN – start again',

  // Onboarding
  obHello: 'Hello! I am Avi.',
  obHelloBody: 'I help you check, protect and train your memory. You do this with short games.',
  obStart: 'Start',
  obWhy: 'What do you want to do?',
  pathCheck: 'Check my memory', pathCheckSub: 'One short brain check-up',
  pathPrevent: 'Keep my brain strong', pathPreventSub: '3 short games every day',
  pathTrain: 'Daily brain training', pathTrainSub: 'Easy games every day',
  obName: 'What is your name?', obNameHint: 'Type your first name or a nickname. Your name stays on this device.',
  obNamePh: 'Your name',
  obReminder: 'When do you want a reminder?',
  remMorning: 'Morning', remAfternoon: 'Afternoon', remEvening: 'Evening', remNone: 'No reminders',
  obPin: 'Do you want a PIN?',
  obPinBody: 'A PIN locks aivOavi. Only a person with the PIN can open it. You can add a PIN later.',
  obPinSet: 'Add a PIN', obPinSkip: 'Not now',
  pinChoose: 'Type a PIN with 4 to 6 numbers', pinRepeat: 'Type the same PIN again', pinMismatch: 'The two PINs are not the same. Try again.',
  obPrivacy: 'Your data is private',
  privacyBody: [
    'Your data stays on this device.',
    'Your data is locked (encrypted). There are no accounts, no advertisements and no tracking.',
    'aivOavi does not send your data to us or to other persons.',
  ],
  obGo: 'Go to my home screen',

  // Home
  hi: 'Hello {name}!', hiNoName: 'Hello!', friend: 'friend',
  playToday: "Play today's games", playTodaySub: '3 short games',
  allDone: 'You are finished for today!', allDoneSub: 'Your garden has a new plant. You can close aivOavi now. Come back tomorrow.',
  playMore: 'Play more',
  todayPlan: "Today's games", gameOf: 'Game {n} of {total}',
  brainCheck: 'Brain Check-up', brainCheckSub: 'Approximately 8 minutes',
  myProgress: 'My Brain Journey', myGarden: 'My Garden', allGames: 'All games', settings: 'Settings',
  streakDays: '{n} days in a row', streakStart: 'Play today to start a series!',
  levelLabel: 'Level {n}: {name}', xp: '{n} XP',
  missedNudge: 'Welcome back, {name}! Play one short game to start again.',
  checkDue: 'It is time for a new Brain Check-up.',

  // Game shell
  howToPlay: 'How to play', letsGo: 'Start the game', result: 'Result', score: 'Score', level: 'Level',
  xpEarned: '+{n} XP', levelUp: 'Level up! The games are now a little more difficult.', levelDown: 'The next game is now a little easier.',
  nextGame: 'Next game', finish: 'Go to Home', newBest: 'This is your best score!',
  dayComplete: "You finished today's games!", plantGrew: 'A new plant is in your garden.',
  badgeNew: 'New badge: {name}',
  quitGame: 'Stop this game?',

  // Encouragement (never "wrong")
  cheer: ['Very good!', 'Excellent!', 'You did it!', 'Well done!', 'Good work!'],
  soft: ['Try the next one.', 'Good try!', 'Almost!', 'Continue!'],

  // Games
  g_memory_match: 'Memory Match', g_memory_match_how: 'Look at the cards. Remember where each picture is. Then find the pairs.',
  mm_peek: 'Remember the cards!', mm_find: 'Find the pairs', mm_card: 'Card {n}', mm_card_up: 'Card {n}: {sym}',
  g_pattern_echo: 'Pattern Echo', g_pattern_echo_how: 'Watch the tiles. They light up one at a time. Then touch them in the same order.',
  pe_watch: 'Watch…', pe_your_turn: 'Now you!', pe_round: 'Round {n} of {total}',
  pe_tiles: ['Yellow star', 'Green circle', 'Orange triangle', 'Blue square'], pe_shapes: ['★', '●', '▲', '■'],
  g_word_garden: 'Word Garden', g_word_garden_how: 'Remember the words. Then give water to the plant. Then find the words.',
  wg_remember: 'Remember this word', wg_water: 'Give water to the plant. Touch the drop {n} more times.', wg_pick: 'Which words did you see? Touch them. Then touch Done.',
  g_number_path: 'Number Path', g_number_path_how: 'Touch the circles in order: 1, 2, 3…',
  g_number_path_how_alt: 'Touch the circles in order. Use a number, then a letter: 1, A, 2, B, 3, C…',
  np_next: 'Next: {v}', np_dot: 'Circle {v}',
  g_odd_one_out: 'Odd One Out', g_odd_one_out_how: 'One item is different from the others. Touch it.',
  oo_q: 'Which one is different?',
  g_clock_setter: 'Clock Setter', g_clock_setter_how: 'Use the buttons to move the clock hands. Then touch Check.',
  cs_set: 'Set the clock to', cs_hour: 'Hour', cs_min: 'Minutes', cs_earlier: 'Earlier', cs_later: 'Later',
  g_today_quiz: 'Today Quiz', g_today_quiz_how: 'Answer some easy questions about today.',
  tq_day: 'What day of the week is it today?', tq_month: 'What month is it?', tq_year: 'What year is it?',
  tq_season: 'What season is it now?', tq_part: 'What part of the day is it now?',
  tq_week: 'How many days are in one week?', tq_after: 'Which day comes after {d}?',
  g_face_name: 'Face & Name', g_face_name_how: 'Meet some new friends. Remember their names.',
  fn_meet: 'Say hello to', fn_who: 'What is the name of this person?',
  seasons: ['Spring', 'Summer', 'Autumn', 'Winter'],
  parts: ['Morning', 'Afternoon', 'Evening', 'Night'],
  days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],

  // Domains (brain areas)
  d_memory: 'Short-term memory', d_working: 'Working memory', d_recall: 'Word memory', d_attention: 'Attention',
  d_reasoning: 'Reasoning', d_visuospatial: 'Space & shapes', d_orientation: 'Orientation', d_associative: 'Names & faces',
  d_fluency: 'Word finding',

  // Check-up
  ck_title: 'Brain Check-up',
  ck_intro: 'The check-up has 6 short parts. It takes approximately 8 minutes. Sit in a quiet place. Do not hurry.',
  ck_disclaimer: 'This check-up is a screening game. It is not a medical diagnosis. Only a doctor can diagnose dementia. If you are worried about your memory, speak to your doctor.',
  ck_part: 'Part {n} of {total}',
  ck_words_learn: 'Remember these 5 words. At the end, I will ask you about them.',
  ck_words_ready: 'I remember them',
  ck_orient: 'Some questions about today',
  ck_trail_a: 'Touch 1 to 10 in order',
  ck_trail_b: 'Now use a number, then a letter: 1, A, 2, B, 3, C…',
  ck_clock: 'Set the clock',
  ck_fluency: 'Touch all the ANIMALS. You have 60 seconds.',
  ck_fluency_go: 'Start the timer',
  ck_recall: 'Which 5 words did you see at the start? Touch them. Then touch Done.',
  ck_result: 'Your check-up result',
  ck_ok_title: 'Your results are good!', ck_ok_body: 'Your results are in the healthy range. Play the games to keep your brain strong.',
  ck_warn_title: 'Some areas need attention', ck_warn_body: 'Some results are lower than expected. Many things can cause this, for example tiredness or stress. Speak to your doctor. Show this summary to your doctor.',
  ck_baseline: 'This is your first check-up. It is your starting point. aivOavi compares your next check-ups with it.',
  ck_vs: 'Change since your first check-up: {d} points',
  ck_next: 'Do the next check-up in approximately 4 weeks.',
  ck_end: 'The check-up is finished. You can close aivOavi now.',
  ck_print: 'Print summary for my doctor',

  // Progress
  pr_title: 'My Brain Journey', pr_overall: 'Brain score over time', pr_by_area: 'Score for each brain area', pr_checkups: 'Check-ups',
  pr_week: 'Week', pr_month: 'Month', pr_all: 'All',
  pr_none: 'Play some games. Then your results show here.',
  pr_baseline: 'Your starting point',
  tr_ok_title: 'Your scores are stable', tr_ok_body: 'Your scores stay the same or go up. Good work!',
  tr_up_title: 'Your scores go up!', tr_up_body: 'Your scores are better than at the start. Continue to play!',
  tr_warn_title: 'Your scores are lower', tr_warn_body: 'Your scores are lower than your starting point for 3 weeks. Continue to play. Ask your doctor for a memory check.',
  tr_new_title: 'Avi is learning about you', tr_new_body: 'Play for approximately 3 weeks. Then Avi can show your trend.',
  pr_table: 'Show as table', pr_date: 'Date', pr_game: 'Game', pr_points: 'Points',

  // Garden & badges
  gd_title: 'My Garden', gd_empty: "Finish today's games. Then your first flower grows!", gd_count: '{n} plants',
  gd_badges: 'My badges',
  levels: ['Seed', 'Sprout', 'Bloom', 'Blossom', 'Mighty Oak'],
  b_first: 'First game', b_check: 'First check-up', b_streak3: '3 days in a row', b_streak7: '7 days in a row',
  b_streak30: '30 days in a row', b_games25: '25 games', b_games100: '100 games', b_explorer: 'All games played',
  b_perfect: 'Perfect score', b_garden10: '10 plants',

  // Settings
  st_title: 'Settings', st_text: 'Text size', st_voice: 'Read each screen aloud', st_sound: 'Happy sounds',
  st_motion: 'Calm mode (less movement)',
  st_rem: 'Daily reminder', st_rem_time: 'Reminder time', st_rem_enable: 'Turn on notifications', st_rem_test: 'Send a test reminder',
  st_rem_on: 'Notifications are on.', st_rem_blocked: 'Your browser blocks notifications. Change this in the browser settings.',
  st_rem_unsupported: 'This browser cannot show notifications.',
  st_rem_note: 'The browser can show a reminder only when aivOavi is open or installed. For a reminder that always works, add it to your calendar.',
  st_rem_cal: 'Add daily reminder to my calendar',
  st_install: 'Add aivOavi to your home screen. Then you can open it like an app.',
  st_season: 'Season questions', st_north: 'North', st_south: 'South', st_off: 'Off',
  st_care: 'Caregiver area', st_privacy: 'Privacy',
  on: 'On', off: 'Off',

  // Caregiver
  cg_title: 'Caregiver area', cg_gate: 'This area is for caregivers. Answer this question:', cg_gate_q: 'What is {a} + {b}?',
  cg_gate_pin: 'Type the PIN to continue.',
  cg_mode: 'Easy mode', cg_mode_body: 'One big Play button. No timers. No scores. Kind feedback.',
  cg_path: 'Main goal', cg_pin: 'PIN lock', cg_pin_on: 'The PIN is on. The PIN locks the data.', cg_pin_off: 'There is no PIN. A key on this device locks the data.',
  cg_pin_add: 'Add PIN', cg_pin_change: 'Change PIN', cg_pin_remove: 'Remove PIN',
  cg_details: 'Detailed progress', cg_summary: 'Doctor summary (print)',
  cg_backup: 'Backup', cg_export: 'Save a locked backup', cg_import: 'Restore from backup',
  cg_backup_pass: 'Type a backup password (minimum 8 characters). Keep the password. You need it to restore the backup.',
  cg_backup_pass_in: 'Type the backup password', cg_backup_ok: 'The backup is saved.', cg_restore_ok: 'The backup is restored.',
  cg_restore_bad: 'aivOavi cannot open this backup. Make sure that the password and the file are correct.',
  cg_delete: 'Delete all my data', cg_delete_confirm: 'This deletes all aivOavi data on this device. You cannot undo this. Delete all data?',
  cg_deleted: 'All data is deleted.',
  pass: 'Password',

  // Summary (doctor)
  sm_title: 'aivOavi summary', sm_for: 'For: {name}', sm_made: 'Date: {date}',
  sm_note: 'aivOavi is an app for brain training and self-screening. These results are not a diagnosis. Scores go from 0 to 100.',
  sm_weekly: 'Average brain score for each week (games)', sm_week: 'Week of', sm_avg: 'Average', sm_n: 'Games',
  sm_print: 'Print',

  // Notifications (no health data in these!)
  nf_title: 'aivOavi', nf_body: '🧠 It is time for your brain games.',
  nf_test: 'This is an example of your daily reminder.',
  speechNone: 'This device cannot read aloud.',
};

// Game & check-up content
export const content = {
  memorySymbols: ['🍎', '🌻', '🐟', '🚗', '🏠', '⭐', '🎈', '🐶', '🌙', '☂️', '🍰', '🎵'],
  memoryNames: { '🍎': 'apple', '🌻': 'sunflower', '🐟': 'fish', '🚗': 'car', '🏠': 'house', '⭐': 'star', '🎈': 'balloon', '🐶': 'dog', '🌙': 'moon', '☂️': 'umbrella', '🍰': 'cake', '🎵': 'music' },
  // Simple, concrete, easy-to-picture words
  words: ['apple', 'river', 'chair', 'garden', 'candle', 'bread', 'window', 'horse', 'blanket', 'violin', 'lemon', 'bridge',
    'pencil', 'rose', 'kettle', 'mountain', 'button', 'tiger', 'basket', 'cloud', 'carrot', 'piano', 'ladder', 'ocean',
    'hat', 'clock', 'feather', 'orange', 'boat', 'mirror', 'cheese', 'forest', 'drum', 'spoon', 'sheep', 'train'],
  categories: [
    { name: 'Fruit', tier: 1, items: [['🍎', 'Apple'], ['🍌', 'Banana'], ['🍇', 'Grapes'], ['🍐', 'Pear'], ['🍓', 'Strawberry'], ['🍊', 'Orange']] },
    { name: 'Animals', tier: 1, items: [['🐶', 'Dog'], ['🐱', 'Cat'], ['🐴', 'Horse'], ['🐮', 'Cow'], ['🐷', 'Pig'], ['🐑', 'Sheep']] },
    { name: 'Vehicles', tier: 1, items: [['🚗', 'Car'], ['🚌', 'Bus'], ['🚲', 'Bicycle'], ['🚂', 'Train'], ['✈️', 'Plane'], ['🚢', 'Ship']] },
    { name: 'Clothes', tier: 1, items: [['👕', 'Shirt'], ['👖', 'Trousers'], ['🧦', 'Socks'], ['🧥', 'Coat'], ['👗', 'Dress'], ['🧣', 'Scarf']] },
    { name: 'Music', tier: 2, items: [['🎸', 'Guitar'], ['🎹', 'Piano'], ['🥁', 'Drum'], ['🎺', 'Trumpet'], ['🎻', 'Violin'], ['🪗', 'Accordion']] },
    { name: 'Weather', tier: 2, items: [['☀️', 'Sun'], ['🌧️', 'Rain'], ['❄️', 'Snow'], ['⛅', 'Cloud'], ['🌈', 'Rainbow'], ['🌬️', 'Wind']] },
    { name: 'Vegetables', tier: 2, items: [['🥕', 'Carrot'], ['🥦', 'Broccoli'], ['🌽', 'Corn'], ['🥔', 'Potato'], ['🍅', 'Tomato'], ['🧅', 'Onion']] },
    { name: 'Tools', tier: 2, items: [['🔨', 'Hammer'], ['🪛', 'Screwdriver'], ['🪚', 'Saw'], ['🔧', 'Spanner'], ['🪓', 'Axe'], ['📏', 'Ruler']] },
    { name: 'Birds', tier: 3, items: [['🦆', 'Duck'], ['🦉', 'Owl'], ['🦅', 'Eagle'], ['🐦', 'Robin'], ['🦜', 'Parrot'], ['🐧', 'Penguin']] },
    { name: 'Sea animals', tier: 3, items: [['🐟', 'Fish'], ['🐙', 'Octopus'], ['🦀', 'Crab'], ['🐳', 'Whale'], ['🐬', 'Dolphin'], ['🦑', 'Squid']] },
    { name: 'Kitchen', tier: 3, items: [['🍳', 'Pan'], ['🥄', 'Spoon'], ['🍴', 'Fork'], ['🫖', 'Teapot'], ['🔪', 'Knife'], ['🥣', 'Bowl']] },
    { name: 'Sports', tier: 3, items: [['⚽', 'Football'], ['🏀', 'Basketball'], ['🎾', 'Tennis'], ['🏐', 'Volleyball'], ['⚾', 'Baseball'], ['🏈', 'Rugby ball']] },
  ],
  animals: [['🐶', 'Dog'], ['🐱', 'Cat'], ['🐴', 'Horse'], ['🐮', 'Cow'], ['🐷', 'Pig'], ['🐑', 'Sheep'], ['🦁', 'Lion'], ['🐘', 'Elephant'],
    ['🐸', 'Frog'], ['🐰', 'Rabbit'], ['🦊', 'Fox'], ['🐻', 'Bear'], ['🐔', 'Hen'], ['🦒', 'Giraffe']],
  notAnimals: [['🍎', 'Apple'], ['🚗', 'Car'], ['🏠', 'House'], ['☂️', 'Umbrella'], ['🌻', 'Flower'], ['⚽', 'Ball'], ['🔑', 'Key'],
    ['📚', 'Books'], ['🎈', 'Balloon'], ['🕰️', 'Clock'], ['🍞', 'Bread'], ['👟', 'Shoe'], ['🌳', 'Tree'], ['🪑', 'Chair']],
  names: ['Anna', 'Ben', 'Clara', 'David', 'Ella', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack', 'Lily', 'Max', 'Nora', 'Oscar', 'Rosa', 'Sam', 'Tara', 'Victor'],
  numberWords: ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'],
  /** Clock time in words, e.g. (3, 15) -> "quarter past three". h is 1–12, m is a multiple of 5. */
  timeWords(hr, m) {
    const w = this.numberWords, nextH = (hr % 12) + 1;
    const mins = { 5: 'five', 10: 'ten', 15: 'quarter', 20: 'twenty', 25: 'twenty-five', 30: 'half' };
    if (m === 0) return `${w[hr]} o'clock`;
    if (m <= 30) return `${mins[m]} past ${w[hr]}`;
    return `${mins[60 - m]} to ${w[nextH]}`;
  },
};
