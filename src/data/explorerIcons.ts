const svg = (body: string, cls = 'gx-svg') =>
  `<svg class="${cls}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const ground = '<path d="M3 42h42" opacity=".45"/>';

const SHAPES: Record<string, string> = {
  eagle: `${ground}
    <path d="M14 25h20v8H14z"/>
    <path d="M16 25l2-10 6-4 8 4 1 10"/>
    <path d="M20 17l3-1-1 4z"/>
    <path d="M14 27L6 41M34 27l8 14M3 41h6M39 41h6M24 33v8M21 41h6"/>
    <path d="M31 13l4-5"/><circle cx="36" cy="7" r="1.6"/>`,
  alsep: `${ground}
    <path d="M7 30h17v12H7z"/>
    <path d="M15 30V18M10 15q5.5 6 11 0z"/>
    <path d="M24 38q7 4 11 0"/>
    <path d="M34 42a5.5 5.5 0 0 1 11 0"/>
    <path d="M3 34h4v8H3z"/>`,
  lrv: `${ground}
    <circle cx="12" cy="36" r="5.5"/><circle cx="36" cy="36" r="5.5"/>
    <path d="M12 36l-3.5-3.5M12 36l3.5 3.5M36 36l-3.5-3.5M36 36l3.5 3.5"/>
    <path d="M5 29h38M5 29q7-7 14 0M29 29q7-7 14 0"/>
    <path d="M21 29v-6h4M27 29v-6h4"/>
    <path d="M18 29l-3-11M10 15q5-7 10 0z"/>`,
  sojourner: `${ground}
    <path d="M11 20h26M14 20v7h20v-7"/>
    <path d="M20 20v-2M28 20v-2"/>
    <path d="M30 20l3-9"/>
    <path d="M11 37l7-8h12l7 8M24 37v-8"/>
    <circle cx="11" cy="37.5" r="3.5"/><circle cx="24" cy="37.5" r="3.5"/><circle cx="37" cy="37.5" r="3.5"/>`,
  mer: `${ground}
    <path d="M3 23l10-4h22l10 4-10 3H13z"/>
    <path d="M31 19V9M27 5h8v4h-8z"/>
    <path d="M16 26v4h16v-4"/>
    <path d="M11 37l7-7h12l7 7M24 37v-7"/>
    <circle cx="11" cy="37.5" r="3.5"/><circle cx="24" cy="37.5" r="3.5"/><circle cx="37" cy="37.5" r="3.5"/>`,
  insight: `${ground}
    <circle cx="9" cy="20" r="7"/><circle cx="39" cy="20" r="7"/>
    <path d="M9 13v14M39 13v14"/>
    <path d="M16 20h3M29 20h3"/>
    <path d="M19 17h10v8H19z"/>
    <path d="M21 25l-3 17M27 25l3 17"/>
    <path d="M28 17l8-6 4 8"/>
    <path d="M34 42a5 5 0 0 1 10 0"/>`,
};

const BY_ID: Record<string, string> = {
  eagle: 'eagle',
  alsep: 'alsep',
  lrv: 'lrv',
  sojourner: 'sojourner',
  spirit: 'mer',
  opportunity: 'mer',
  insight: 'insight',
};

export const exIcon = (id: string, cls?: string) => svg(SHAPES[BY_ID[id] ?? 'mer'], cls);

const ui = (body: string) =>
  `<svg class="gx-ui" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const UI = {
  story: ui('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7M8 11h7"/>'),
  file: ui('<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M7 12h10M7 16h6"/>'),
  disc: ui('<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L20 20M7 10h6M10 7v6"/>'),
  rec: ui('<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>'),
  born: ui('<path d="M14 6a4 4 0 0 0 5 5l-9 9a2 2 0 0 1-3-3l9-9a4 4 0 0 0-2-2z"/>'),
  trip: ui('<path d="M12 2c3 2 5 6 5 10l-2 5H9l-2-5c0-4 2-8 5-10z"/><circle cx="12" cy="10" r="2"/><path d="M9 17l-2 4M15 17l2 4M12 17v4"/>'),
  mission: ui('<circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/><path d="M8 11h6"/>'),
  last: ui('<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z"/>'),
  legacy: ui('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'),
  sound: ui('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'),
  play: ui('<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="16" cy="11.5" r="1" fill="currentColor"/><circle cx="18" cy="14" r="1" fill="currentColor"/>'),
  medal: ui('<path d="M8 2l4 7 4-7"/><circle cx="12" cy="15" r="6"/><path d="M12 11.5l1.1 2.2 2.4.3-1.8 1.6.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.6 2.4-.3z" fill="currentColor" stroke="none"/>'),
  globe: ui('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  redo: ui('<path d="M4 4v6h6"/><path d="M20 12A8 8 0 0 0 5.3 7.6L4 10"/><path d="M4 12a8 8 0 0 0 14.7 4.4"/>'),
};
