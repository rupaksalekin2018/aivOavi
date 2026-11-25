// Builds the editable Word version of the aivOavi workshop materials.
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType, LevelFormat, PageBreak, VerticalAlign, TableLayoutType,
} = require('docx');

const [shotsDir, outFile] = process.argv.slice(2);
const GREEN = '0B3D2E', YELLOW = 'FFD23F', MUTED = '56605B', TINT = 'F3F6F4', LINE = 'D6DCD8', HILITE = 'FFF8DB';
const FONT = 'Calibri';
const PAGE_W = 11906, MARGIN = 1080, CW = PAGE_W - 2 * MARGIN; // A4, 0.75 in margins

let listInstance = 0;
const run = (text, o = {}) => new TextRun({ text, font: FONT, ...o });
// Rich text: **bold**, *italic*
function rich(text, base = {}) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(run(text.slice(last, m.index), base));
    const t = m[0];
    if (t.startsWith('**')) parts.push(run(t.slice(2, -2), { ...base, bold: true }));
    else parts.push(run(t.slice(1, -1), { ...base, italics: true }));
    last = m.index + t.length;
  }
  if (last < text.length) parts.push(run(text.slice(last), base));
  return parts;
}
const P = (text, o = {}) => new Paragraph({ children: rich(text, o.run || {}), spacing: { after: 100, line: 264 }, ...o.para });
const H1 = (text, pageBreak = false) => new Paragraph({ heading: 'Heading1', pageBreakBefore: pageBreak, children: [run(text)] });
const H2 = (text) => new Paragraph({ heading: 'Heading2', children: [run(text)] });
function list(items, { size, start } = {}) {
  const inst = ++listInstance;
  return items.map((t) => new Paragraph({
    numbering: { reference: start === 4 ? 'num4' : 'num', level: 0, instance: inst },
    spacing: { after: 50, line: 252 },
    children: rich(t, size ? { size } : {}),
  }));
}
function box(children, { color = GREEN, dashed = false } = {}) {
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CW, type: WidthType.DXA },
      shading: dashed ? undefined : { type: ShadingType.CLEAR, color: 'auto', fill: TINT },
      margins: { top: 90, bottom: 60, left: 160, right: 160 },
      borders: dashed
        ? { top: { style: BorderStyle.DASHED, size: 6, color: 'B9C3BD' }, bottom: { style: BorderStyle.DASHED, size: 6, color: 'B9C3BD' }, left: { style: BorderStyle.DASHED, size: 6, color: 'B9C3BD' }, right: { style: BorderStyle.DASHED, size: 6, color: 'B9C3BD' } }
        : { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.SINGLE, size: 24, color } },
      children,
    })] })],
  });
}
const spacer = (after = 80) => new Paragraph({ spacing: { after }, children: [] });

// Data table with a green, repeated header row.
function dataTable(headers, rows, widths, { center = [], highlight = -1, size = 18 } = {}) {
  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: LINE };
  const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
  const mk = (txt, i, opts = {}) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA }, borders,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    shading: opts.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: opts.fill } : undefined,
    verticalAlign: VerticalAlign.TOP,
    children: String(txt).split('\n').map((line) => new Paragraph({
      alignment: center.includes(i) ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: 0, line: 240 },
      children: rich(line, { size, color: opts.color, bold: opts.bold }),
    })),
  });
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => mk(h, i, { fill: GREEN, color: 'FFFFFF', bold: true })) }),
      ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => mk(c, i, { fill: ri === highlight ? HILITE : undefined })) })),
    ],
  });
}
const noBorders = { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } };
function twoCols(left, right) {
  const half = Math.floor(CW / 2);
  const cell = (children, padL, padR) => new TableCell({ width: { size: half, type: WidthType.DXA }, borders: noBorders, margins: { left: padL, right: padR }, children });
  return new Table({ width: { size: half * 2, type: WidthType.DXA }, columnWidths: [half, half], borders: noBorders,
    rows: [new TableRow({ children: [cell(left, 0, 140), cell(right, 140, 0)] })] });
}

// ---------- Content ----------
const children = [];

// Title block
children.push(new Paragraph({
  border: { left: { style: BorderStyle.SINGLE, size: 36, color: YELLOW, space: 10 } },
  spacing: { after: 0 }, indent: { left: 200 },
  children: [run('aivOavi: Workshop Materials', { size: 44, bold: true, color: GREEN })],
}));
children.push(new Paragraph({
  border: { left: { style: BorderStyle.SINGLE, size: 36, color: YELLOW, space: 10 } },
  spacing: { after: 0 }, indent: { left: 200 },
  children: [run('A brain game web app to check, protect and train memory', { size: 22, color: MUTED })],
}));
children.push(new Paragraph({
  border: { left: { style: BorderStyle.SINGLE, size: 36, color: YELLOW, space: 10 } },
  spacing: { after: 120 }, indent: { left: 200 },
  children: [
    run('Students: ', { bold: true, size: 20 }), run('______________________      ', { size: 20, color: MUTED }),
    run('Course: ', { bold: true, size: 20 }), run('______________________      ', { size: 20, color: MUTED }),
    run('Date: ', { bold: true, size: 20 }), run('November 2026', { size: 20, color: MUTED }),
  ],
}));

// 1
children.push(H1('1. About this document'));
children.push(P('This document has the materials that we made in the workshop session. There are four parts: the need statement, the personas, the competitor analysis and the prototype screenshots. The references are at the end.'));
children.push(P('aivOavi is a free web app. It helps people check their memory, keep their brain strong and practise every day. It works in a normal web browser. All data stays on the device of the user. **aivOavi is not a medical test, and it cannot diagnose dementia.**'));

// 2
children.push(H1('2. Need statement'));
children.push(H2('2.1 The problem'));
children.push(...list([
  'In 2021, approximately 57 million people in the world had dementia. Every year there are approximately 10 million new cases [1].',
  'Approximately 75% of people with dementia do not have a diagnosis. In low-income countries, this can be up to 90% [2].',
  'People can lower their risk. The Lancet Commission found 14 risk factors that people can change. If we remove them, approximately 45% of cases can possibly be prevented or delayed [3]. Two large trials also show a small benefit from training and a healthy lifestyle [4], [5].',
  'The tools that people can use today have problems. Many cost money every month. Many are not made for people with early dementia. Some make claims that science does not support. In 2016, the maker of Lumosity paid $2 million to settle deceptive advertising charges from the US FTC [6], [7].',
]));
children.push(H2('2.2 The need'));
children.push(box([new Paragraph({ spacing: { after: 40, line: 264 }, children: rich('People who are worried about their memory, healthy people who want to protect their brain, and people with early dementia need **one tool that is free, private and easy to use**. The tool must help them check their memory, practise every day and see changes early. It must also tell them clearly when to speak to a doctor.') })]));
children.push(spacer(60));
children.push(H2('2.3 How aivOavi answers the need, and its limits'));
children.push(twoCols(
  list([
    'A Brain Check-up every 4 weeks, and a trend line that turns orange when scores stay low.',
    'Three short games every day, with a garden, badges and levels.',
    'Easy mode for people with dementia: one big button, large text, no timers.',
  ]),
  list([
    'No account and no server. The data is encrypted on the device.',
    'Limit: the check-up is not clinically validated. It does not replace a doctor.',
    'Limit: nobody has proved that these games prevent dementia [6].',
  ], { start: 4 }),
));

// 3
children.push(H1('3. Personas'));
children.push(P('We made five personas. Three of them use the app directly. The caregiver and the doctor get help from the app in a different way. The personas are examples, not real people.'));
children.push(dataTable(
  ['Persona', 'Goal', 'Problem today', 'How aivOavi helps'],
  [
    ['**Sam, 66**\nThe Checker', 'Find out if the memory is changing.', 'Sam forgets names and is worried. Sam is not ready to see a doctor yet.', 'An 8-minute check-up with a clear green or orange result. A summary to print for the doctor.'],
    ['**Rosa, 54**\nThe Preventer', 'Keep the brain strong with a short daily habit.', 'Rosa is healthy but has a family history of dementia. Rosa has little free time.', 'Three short games each day. Levels, a streak and a garden keep Rosa motivated. The trend shows early changes.'],
    ['**Joe, 78**\nThe Trainee', 'Practise every day without stress.', 'Joe has early dementia. Most apps have small text, many buttons and timers.', 'Easy mode: one big button, "Start here" and "You are finished" markers, read aloud, and no "wrong" answers.'],
    ['**Priya, 45**\nThe Caregiver', 'Help Joe from a distance.', 'Priya does not know if Joe practises or if things change.', 'A caregiver area with a PIN, detailed progress, a locked backup and the doctor summary.'],
    ['**Dr. Mensah**\nThe Reader', 'Make a good decision about a memory test.', 'One short visit shows only one result.', 'A printed summary with results from many weeks at home.'],
  ],
  [1650, 2150, 2900, CW - 1650 - 2150 - 2900],
));

// 4
children.push(H1('4. Competitor analysis'));
children.push(P('We compared aivOavi with six products: three brain-training apps, one app for training and testing, and two screening tests. We took the facts from the product pages and app store pages in November 2026 [8]–[13]. Prices can change.'));
const Y = '✔', N = '✘', Q = '?';
const cw4 = [1500, 1500, 2200]; const rest = CW - cw4.reduce((a, b) => a + b, 0); const q = Math.floor(rest / 4);
children.push(dataTable(
  ['Product', 'Type', 'Cost', 'Memory screening', 'Daily training', 'Mode for dementia', 'No account, data on device'],
  [
    ['**aivOavi**', 'Web app', 'Free', Y, Y, Y, Y],
    ['Lumosity [10]', 'Phone app, website', 'Free basic; paid premium', N, Y, Q, Q],
    ['BrainHQ [8]', 'Phone app, website', '$14 a month or $96 a year', N, Y, Q, Q],
    ['Elevate [11]', 'Phone app', 'Free basic; paid subscription', N, Y, Q, Q],
    ['CogniFit [9]', 'Phone app, website', 'Paid plans; assessment sold separately', `${Y} (paid)`, Y, Q, Q],
    ['SAGE test [12]', 'Paper test', 'Free for personal clinical use', Y, N, N, `${Y} (paper)`],
    ['BrainCheck [13]', 'Test for clinics', 'Sold to clinics', Y, N, N, N],
  ],
  [...cw4, q, q, q, rest - 3 * q],
  { center: [3, 4, 5, 6], highlight: 0 },
));
children.push(new Paragraph({ spacing: { before: 40, after: 100 }, children: [run('✔ = yes  ·  ✘ = no  ·  ? = we did not find this information (it does not mean "no").', { size: 17, color: MUTED })] }));
children.push(twoCols(
  [H2('4.1 Strengths of the competitors'), ...list([
    'BrainHQ has the strongest evidence. Its speed exercise comes from the ACTIVE trial [5].',
    'SAGE is free and simple, and it is studied by Ohio State University [12].',
    'BrainCheck is made for doctors and clinics [13].',
  ]), H2('4.2 Weaknesses of the competitors'), ...list([
    'Most training apps need a paid plan for all functions.',
    'Training apps do not include a regular check-up, except CogniFit (paid).',
    'Screening tests do not include daily training.',
  ])],
  [H2('4.3 The gap that aivOavi fills'),
    P('No other product in this comparison has all of these together: it is free, it has a check-up *and* daily training *and* a trend, it has a special mode for people with dementia, and it keeps all data on the device.'),
    H2('4.4 Risks for aivOavi'), ...list([
      'aivOavi has no clinical evidence yet.',
      'It must not claim that it prevents or diagnoses dementia. The FTC case shows this risk [7].',
      'It has no income. It needs a funding plan, for example a grant.',
    ])],
));
children.push(H2('4.5 How the parts connect'));
children.push(box([new Paragraph({ spacing: { after: 40, line: 264 }, children: rich('The four parts of this work follow one line. The **need statement** shows the problem: many people have memory problems, but few get help early. The **personas** show who has this problem and what each person needs. The **competitor analysis** shows that no current product covers all these needs together. The **prototype** in section 5 shows our answer: one simple app that tells each user where to start and when to stop.') })]));

// 5
children.push(H1('5. Prototype screenshots', true));
children.push(P('The prototype is a working web app. The pictures show the main screens on a phone, in the order a user sees them. The app tells the user where to start ("▼ Start here") and when to stop ("■ You are finished for today").'));
const shots = [
  ['01-welcome', 'Welcome and "Start here"'], ['02-choose-path', 'Choose a path (step 1 of 5)'], ['04-home', "Home with today's 3 games"],
  ['game-memory-match', 'Game: Memory Match'], ['14-game-result', 'Result with stars and points'], ['26-home-finished', 'End: "You are finished for today"'],
  ['16-checkup-words', 'Check-up, part 1: remember 5 words'], ['19-checkup-clock', 'Check-up, part 4: set the clock'], ['06-progress-ok', 'Progress: green, all OK'],
  ['24-progress-warning', 'Progress: orange warning'], ['22-easy-home', 'Easy mode for Joe'], ['12-caregiver', 'Caregiver area for Priya'],
];
const colW = Math.floor(CW / 6);
const IMG_W = 82, IMG_H = Math.round(82 * 690 / 390);
const shotRows = [];
for (let r = 0; r < 2; r++) {
  const slice = shots.slice(r * 6, r * 6 + 6);
  shotRows.push(new TableRow({ cantSplit: true, children: slice.map(([file]) => new TableCell({
    width: { size: colW, type: WidthType.DXA }, borders: noBorders, margins: { left: 40, right: 40, top: 60 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new ImageRun({
      type: 'png', data: fs.readFileSync(path.join(shotsDir, file + '.png')),
      transformation: { width: IMG_W, height: IMG_H }, altText: { title: file, description: file, name: file },
    })] })],
  })) }));
  shotRows.push(new TableRow({ cantSplit: true, children: slice.map(([, cap], i) => new TableCell({
    width: { size: colW, type: WidthType.DXA }, borders: noBorders, margins: { left: 40, right: 40 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60, line: 228 }, children: [
      run(`Fig. ${r * 6 + i + 1} `, { size: 15, bold: true }), run(cap, { size: 15, color: MUTED })] })],
  })) }));
}
children.push(new Table({ width: { size: colW * 6, type: WidthType.DXA }, columnWidths: Array(6).fill(colW), borders: noBorders, rows: shotRows }));

// 6
children.push(H1('6. References'));
const refs = [
  'World Health Organization. (n.d.). *Dementia* [Fact sheet]. Retrieved November 2026, from https://www.who.int/news-room/fact-sheets/detail/dementia',
  "Alzheimer's Disease International. (2021). *World Alzheimer Report 2021: Journey through the diagnosis of dementia.* https://www.alzint.org/news-events/news/over-41-million-cases-of-dementia-go-undiagnosed-across-the-globe-world-alzheimer-report-reveals/",
  'Livingston, G., Huntley, J., Liu, K. Y., et al. (2024). Dementia prevention, intervention, and care: 2024 report of the Lancet standing Commission. *The Lancet, 404*(10452), 572–628. https://doi.org/10.1016/S0140-6736(24)01296-0',
  'Ngandu, T., Lehtisalo, J., Solomon, A., et al. (2015). A 2 year multidomain intervention of diet, exercise, cognitive training, and vascular risk monitoring versus control to prevent cognitive decline in at-risk elderly people (FINGER). *The Lancet, 385*, 2255–2263. https://pubmed.ncbi.nlm.nih.gov/25771249/',
  "Edwards, J. D., Xu, H., Clark, D. O., et al. (2017). Speed of processing training results in lower risk of dementia. *Alzheimer's & Dementia: Translational Research & Clinical Interventions, 3*(4), 603–611. https://doi.org/10.1016/j.trci.2017.09.002",
  'Simons, D. J., Boot, W. R., Charness, N., et al. (2016). Do "brain-training" programs work? *Psychological Science in the Public Interest, 17*(3), 103–186. https://doi.org/10.1177/1529100616661983',
  'US Federal Trade Commission. (2016, January 5). *Lumosity to pay $2 million to settle FTC deceptive advertising charges for its "brain training" program* [Press release]. https://www.ftc.gov/news-events/press-releases/2016/01/lumosity-pay-2-million-settle-ftc-deceptive-advertising-charges',
  'BrainHQ. (n.d.). *Choosing a personal subscription plan.* Retrieved November 2026, from https://support.brainhq.com/hc/en-us/articles/115002103266-Choosing-a-personal-subscription-plan',
  'CogniFit. (n.d.). *CogniFit – Brain Training* [Mobile app]. App Store. Retrieved November 2026, from https://apps.apple.com/app/id528285610',
  'Lumos Labs. (n.d.). *Lumosity: Brain Training Games* [Mobile app]. App Store. Retrieved November 2026, from https://apps.apple.com/us/app/lumosity-brain-training-games/id577232024',
  'Elevate Labs. (n.d.). *Elevate – Brain Training Games* [Mobile app]. App Store. Retrieved November 2026, from https://apps.apple.com/us/app/id875063456',
  'The Ohio State University Wexner Medical Center. (n.d.). *SAGE: Self-Administered Gerocognitive Examination.* Retrieved November 2026, from https://wexnermedical.osu.edu/brain-spine-neuro/memory-disorders/sage',
  'BrainCheck. (n.d.). *BrainCheck Assess.* Retrieved November 2026, from https://braincheck.com/platform/assess',
];
const refInst = ++listInstance;
refs.forEach((t) => children.push(new Paragraph({
  numbering: { reference: 'refs', level: 0, instance: refInst }, spacing: { after: 30, line: 240 }, children: rich(t, { size: 17 }),
})));
const dash = { style: BorderStyle.DASHED, size: 6, color: 'B9C3BD', space: 4 };
children.push(new Paragraph({ spacing: { before: 140, after: 0 }, indent: { left: 80, right: 80 },
  border: { top: dash, bottom: dash, left: dash, right: dash },
  children: [run('Note on language: ', { bold: true, size: 20 }), run('English is not our native language. We used AI to help our English sound polished.', { size: 20 })] }));

// ---------- Document ----------
const doc = new Document({
  creator: 'aivOavi team', title: 'aivOavi: Workshop Materials',
  styles: {
    default: { document: { run: { font: FONT, size: 21, color: '1D2320' } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 27, bold: true, color: GREEN },
        paragraph: { spacing: { before: 220, after: 100 }, keepNext: true, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: YELLOW, space: 2 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 22, bold: true, color: GREEN },
        paragraph: { spacing: { before: 120, after: 60 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 300 } } } }] },
    { reference: 'num4', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', start: 4, alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 300 } } } }] },
    { reference: 'refs', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '[%1]', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 440, hanging: 440 } } } }] },
  ] },
  sections: [{ properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: 900, bottom: 900, left: MARGIN, right: MARGIN } } }, children }],
});
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(outFile, buf); console.log('wrote', outFile); });
