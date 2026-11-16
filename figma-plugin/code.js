// Wayfare Builder — local Figma development plugin.
// Runs the design-system steps (A3…) directly in the Figma desktop app,
// so they don't count against the Figma MCP tool-call limit.
// Plain ES2017: no optional chaining / nullish coalescing (plugin sandbox safety).

const FONT = 'Instrument Sans';
const HOMEPAGE_ID = '2645:103'; // used to find the Wayfare page
const IMAGE_SOURCES = {
  kyoto: '2660:266', // Homepage hero card (pagoda)
  fuji: '2662:10371', // Explore experience card (Fuji + tower)
  day1: '2665:10418', // Popular experiences 1, Day 1
};

const V = {}; // variable name -> Variable
const TS = {}; // "Body/14 Medium" -> TextStyle
const ICON = {}; // "Home" -> ComponentNode
const SET = {}; // "Button" -> ComponentSetNode / ComponentNode

const SHADOW_SOFT = {
  type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.12 }, offset: { x: 0, y: 2 },
  radius: 8, spread: 0, visible: true, blendMode: 'NORMAL',
};
const SHADOW_NAV = {
  type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.18 }, offset: { x: 0, y: 8 },
  radius: 24, spread: 0, visible: true, blendMode: 'NORMAL',
};

// ---------- token helpers ----------

async function loadTokens() {
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const wayfare = cols.filter(function (c) { return c.name.indexOf('Wayfare/') === 0; });
  const vars = await figma.variables.getLocalVariablesAsync();
  for (const v of vars) {
    if (wayfare.some(function (c) { return c.id === v.variableCollectionId; })) V[v.name] = v;
  }
  const styles = await figma.getLocalTextStylesAsync();
  for (const s of styles) if (s.name.indexOf('Wayfare/') === 0) TS[s.name.replace('Wayfare/', '')] = s;

  const needVars = ['text/primary', 'text/secondary', 'text/inverse', 'surface/background', 'surface/card',
    'surface/dark', 'border/subtle', 'accent/primary', 'accent/strong', 'accent/soft', 'status/success',
    'status/rating', 'status/warning', 'status/warning-soft', 'status/error', 'status/error-soft',
    'space/4', 'space/8', 'space/12', 'space/16', 'space/20', 'space/24', 'space/32',
    'radius/sm', 'radius/card', 'radius/sheet', 'radius/pill'];
  const needStyles = ['Display/28 Bold', 'Title/22 Semibold', 'Heading/18 Semibold', 'Subheading/16 Semibold',
    'Body/15 Regular', 'Body/14 Medium', 'Caption/13 Regular', 'Micro/12 Medium'];
  const missing = needVars.filter(function (n) { return !V[n]; })
    .concat(needStyles.filter(function (n) { return !TS[n]; }).map(function (n) { return 'style ' + n; }));
  if (missing.length) throw new Error('Missing Wayfare tokens (run step A2 first): ' + missing.join(', '));

  for (const style of ['Regular', 'Medium', 'SemiBold', 'Bold']) await figma.loadFontAsync({ family: FONT, style: style });
}

function paint(name, opacity) {
  const p = { type: 'SOLID', color: { r: 0, g: 0, b: 0 } };
  const bound = figma.variables.setBoundVariableForPaint(p, 'color', V[name]);
  // binding can drop paint opacity, so apply it to the bound paint afterwards
  return opacity === undefined ? bound : Object.assign({}, bound, { opacity: opacity });
}
function fill(n, name, opacity) { n.fills = [paint(name, opacity)]; }
function stroke(n, name, weight, opacity) {
  n.strokes = [paint(name, opacity)]; n.strokeWeight = weight || 1; n.strokeAlign = 'INSIDE';
}
function bindSpace(n, prop, value) {
  n[prop] = value;
  const v = V['space/' + value];
  if (v) n.setBoundVariable(prop, v);
}
function pad(n, t, r, b, l) {
  bindSpace(n, 'paddingTop', t); bindSpace(n, 'paddingRight', r);
  bindSpace(n, 'paddingBottom', b); bindSpace(n, 'paddingLeft', l);
}
function gap(n, value) { bindSpace(n, 'itemSpacing', value); }
function radius(n, key) {
  const v = V['radius/' + key];
  for (const c of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) n.setBoundVariable(c, v);
}

// ---------- node helpers ----------

function auto(name, dir) {
  const f = figma.createFrame();
  f.name = name; f.fills = []; f.clipsContent = false;
  f.layoutMode = dir; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO';
  return f;
}
function comp(name, dir) {
  const c = figma.createComponent();
  c.name = name; c.fills = []; c.clipsContent = false;
  if (dir) { c.layoutMode = dir; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'AUTO'; }
  return c;
}
// fixed size on an auto-layout frame (resize first, then lock both axes)
function fixed(n, w, h) { n.resize(w, h); n.primaryAxisSizingMode = 'FIXED'; n.counterAxisSizingMode = 'FIXED'; }
function center(n) { n.primaryAxisAlignItems = 'CENTER'; n.counterAxisAlignItems = 'CENTER'; }

async function text(chars, style, color, name) {
  const t = figma.createText();
  await t.setTextStyleIdAsync(TS[style].id);
  t.characters = chars;
  fill(t, color);
  t.name = name || chars;
  return t;
}
// text that fills its auto-layout parent's width and wraps / truncates
function fillWidth(t, maxLines) {
  t.textAutoResize = 'HEIGHT';
  t.layoutSizingHorizontal = 'FILL';
  if (maxLines) { t.textTruncation = 'ENDING'; t.maxLines = maxLines; }
}

function recolor(inst, colorVar) {
  if (!colorVar) return;
  const vec = inst.findOne(function (n) { return n.type === 'VECTOR'; });
  if (!vec) return;
  if (vec.strokes.length) vec.strokes = [paint(colorVar)]; else vec.fills = [paint(colorVar)];
}
function icon(name, colorVar, size) {
  const inst = ICON[name].createInstance();
  inst.name = 'Icon';
  if (size && size !== 24) inst.rescale(size / 24);
  recolor(inst, colorVar);
  return inst;
}

async function imagePaint(key) {
  const node = await figma.getNodeByIdAsync(IMAGE_SOURCES[key]);
  if (node && 'fills' in node && Array.isArray(node.fills)) {
    const img = node.fills.find(function (p) { return p.type === 'IMAGE'; });
    if (img) return Object.assign({}, img, { scaleMode: 'FILL' });
  }
  return null;
}
async function imageRect(name, w, h, key) {
  const r = figma.createRectangle();
  r.name = name; r.resize(w, h); radius(r, 'sm');
  const p = await imagePaint(key);
  if (p) r.fills = [p]; else fill(r, 'surface/card');
  return r;
}

// component properties
function propKey(owner, base) {
  const defs = owner.componentPropertyDefinitions;
  return Object.keys(defs).find(function (k) { return k.split('#')[0] === base; });
}
// layers that belong to the component itself — not sublayers of nested instances
// (e.g. the "Label"/"Icon" inside a Button instance used by EmptyState)
function ownLayers(owner, test) {
  return owner.findAll(function (n) {
    if (!test(n)) return false;
    for (let p = n.parent; p && p !== owner; p = p.parent) if (p.type === 'INSTANCE') return false;
    return true;
  });
}
function bindText(owner, layerName, propName, def) {
  const key = owner.addComponentProperty(propName, 'TEXT', def);
  ownLayers(owner, function (n) { return n.type === 'TEXT' && n.name === layerName; }).forEach(function (n) {
    n.componentPropertyReferences = Object.assign({}, n.componentPropertyReferences, { characters: key });
  });
}
function bindSwap(owner, layerName, propName, defaultIconName) {
  const key = owner.addComponentProperty(propName, 'INSTANCE_SWAP', ICON[defaultIconName].id);
  ownLayers(owner, function (n) { return n.type === 'INSTANCE' && n.name === layerName; }).forEach(function (n) {
    n.componentPropertyReferences = Object.assign({}, n.componentPropertyReferences, { mainComponent: key });
  });
}
function bindBool(owner, layerName, propName, def) {
  const key = owner.addComponentProperty(propName, 'BOOLEAN', def);
  ownLayers(owner, function (n) { return n.name === layerName && n.type !== 'VECTOR'; }).forEach(function (n) {
    n.componentPropertyReferences = Object.assign({}, n.componentPropertyReferences, { visible: key });
  });
}
// set instance props by base name, e.g. { Label: 'Book now', Style: 'Dark' }
function setProps(inst, map) {
  const out = {};
  for (const k of Object.keys(inst.componentProperties)) {
    const base = k.split('#')[0];
    if (Object.prototype.hasOwnProperty.call(map, base)) out[k] = map[base];
  }
  inst.setProperties(out);
  return inst;
}
function variant(setName, variantName) {
  const set = SET[setName];
  const v = set.children.find(function (c) { return c.name === variantName; });
  if (!v) throw new Error(setName + ' has no variant ' + variantName);
  return v.createInstance();
}

function styleSet(set, dir, wrapWidth) {
  set.layoutMode = dir; set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO';
  set.itemSpacing = 24; set.counterAxisSpacing = 24;
  set.paddingTop = 24; set.paddingBottom = 24; set.paddingLeft = 24; set.paddingRight = 24;
  if (wrapWidth) { set.layoutWrap = 'WRAP'; set.resize(wrapWidth, set.height); set.primaryAxisSizingMode = 'FIXED'; }
  set.fills = [{ type: 'SOLID', color: { r: 0.93, g: 0.94, b: 0.95 } }];
  set.cornerRadius = 16;
}
function stage(row, name) {
  const s = auto(name || 'Stage', 'HORIZONTAL');
  s.itemSpacing = 24; s.paddingTop = 24; s.paddingBottom = 24; s.paddingLeft = 24; s.paddingRight = 24;
  s.fills = [{ type: 'SOLID', color: { r: 0.93, g: 0.94, b: 0.95 } }]; s.cornerRadius = 16;
  row.appendChild(s);
  return s;
}

// ---------- board ----------

let board;
function boardRow(name, desc) {
  const r = auto('Row / ' + name, 'VERTICAL');
  r.itemSpacing = 16;
  board.appendChild(r);
  const t = figma.createText();
  t.fontName = { family: FONT, style: 'SemiBold' }; t.fontSize = 24; t.characters = name; t.name = 'Row title';
  r.appendChild(t);
  const d = figma.createText();
  d.fontName = { family: FONT, style: 'Regular' }; d.fontSize = 14; d.characters = desc; d.name = 'Row description';
  d.fills = [{ type: 'SOLID', color: { r: 0.42, g: 0.42, b: 0.42 } }];
  r.appendChild(d);
  return r;
}

// ---------- A3: icons ----------

const ICON_SVGS = {
  'Home': '<path d="M3.5 10.2 12 3.5l8.5 6.7V19a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M12 17v-3"/>',
  'Calendar': '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/>',
  'Heart': '<path d="M12 20.5s-8.5-4.9-8.5-11A4.75 4.75 0 0 1 12 6.6a4.75 4.75 0 0 1 8.5 2.9c0 6.1-8.5 11-8.5 11z"/>',
  'Grid': '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  'Arrow Left': '<path d="M10 6 4 12l6 6M20 12H4"/>',
  'Arrow Right': '<path d="M14 6l6 6-6 6M4 12h16"/>',
  'Chevron Right': '<path d="M9 5l7 7-7 7"/>',
  'Search': '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.2-4.2"/>',
  'Filter': '<path d="M3 7h6M15 7h6M3 17h10M19 17h2"/><circle cx="12" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  'User': '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>',
  'Card': '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M6.5 15h3"/>',
  'Bell': '<path d="M12 3a6 6 0 0 0-6 6v3.5L4.5 16h15L18 12.5V9a6 6 0 0 0-6-6zM9.5 19.5a2.5 2.5 0 0 0 5 0"/>',
  'Help': '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
  'Settings': '<path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z"/><circle cx="12" cy="12" r="3"/>',
  'Logout': '<path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3M16 17l5-5-5-5M21 12H9"/>',
  'Luggage': '<rect x="5" y="7" width="14" height="14" rx="3"/><path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7M9 11v6M15 11v6"/>',
  'Map': '<path d="M3 6.5l6-3 6 3 6-3v14l-6 3-6-3-6 3zM9 3.5v14M15 6.5v14"/>',
  'Building': '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M2.5 21h19M8 7h4M8 11h4M8 15h4"/>',
  'Bus': '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M7.5 14.5h.01M16.5 14.5h.01M7 18v3M17 18v3"/>',
  'People': '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5M16 4.8a3.3 3.3 0 0 1 0 6.4M18 14.8c2 .6 3.5 2.4 3.5 5.2"/>',
  'Coffee': '<path d="M4 8h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6zM17 9.5h1a3 3 0 0 1 0 6h-1.5M7 2.5v2M10.5 2.5v2M14 2.5v2M3 21.5h15"/>',
  'Scan': '<path d="M3 8V6a3 3 0 0 1 3-3h2M16 3h2a3 3 0 0 1 3 3v2M21 16v2a3 3 0 0 1-3 3h-2M8 21H6a3 3 0 0 1-3-3v-2M7 12h10"/>',
  'Location': '<path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  'Clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  'Edit': '<path d="M13.5 5.5l5 5M4 20l1-5L15.5 4.5a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3L9 19z"/>',
  'Tick Circle': '<circle cx="12" cy="12" r="9"/><path d="M8 12.2l2.8 2.8L16 9.5"/>',
  'Close': '<path d="M6 6l12 12M18 6 6 18"/>',
  'Plus': '<path d="M12 5v14M5 12h14"/>',
  'Minus': '<path d="M5 12h14"/>',
};
// filled exceptions: liked state and rating star
const ICON_FILLED = {
  'Heart Filled': ['<path d="M12 20.5s-8.5-4.9-8.5-11A4.75 4.75 0 0 1 12 6.6a4.75 4.75 0 0 1 8.5 2.9c0 6.1-8.5 11-8.5 11z"/>', 'status/error'],
  'Star Filled': ['<path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>', 'status/rating'],
};

function makeIcon(grid, name, inner, filledVar) {
  const svg = filledVar
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#000" stroke="none">' + inner + '</svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  const frame = figma.createNodeFromSvg(svg);
  const vec = figma.flatten(frame.children.slice(), frame);
  const c = figma.createComponent();
  c.name = 'Icon/' + name; c.resize(24, 24); c.fills = []; c.clipsContent = false;
  grid.appendChild(c);
  const vx = vec.x, vy = vec.y;
  c.appendChild(vec);
  vec.x = vx; vec.y = vy; vec.name = 'Icon';
  vec.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
  if (filledVar) { vec.fills = [paint(filledVar)]; vec.strokes = []; }
  else { vec.strokes = [paint('text/primary')]; vec.strokeWeight = 1.5; vec.fills = []; }
  frame.remove();
  c.description = filledVar
    ? name + ' — filled (exception to linear-only for liked / rating states).'
    : name + ' — iconsax-style Linear, 24px, 1.5 stroke. Swap for the official Iconsax icon when that library is enabled.';
  ICON[name] = c;
}

function buildIcons() {
  const row = boardRow('Icons', 'Local iconsax-style Linear icons (24px grid, 1.5 stroke). Every component uses them through an Icon swap property.');
  const grid = auto('Icon grid', 'HORIZONTAL');
  grid.itemSpacing = 24; grid.counterAxisSpacing = 24; grid.layoutWrap = 'WRAP';
  grid.paddingTop = 24; grid.paddingBottom = 24; grid.paddingLeft = 24; grid.paddingRight = 24;
  grid.fills = [{ type: 'SOLID', color: { r: 0.93, g: 0.94, b: 0.95 } }]; grid.cornerRadius = 16;
  row.appendChild(grid);
  grid.resize(760, 100); grid.primaryAxisSizingMode = 'FIXED'; grid.counterAxisSizingMode = 'AUTO';
  for (const name of Object.keys(ICON_SVGS)) makeIcon(grid, name, ICON_SVGS[name], null);
  for (const name of Object.keys(ICON_FILLED)) makeIcon(grid, name, ICON_FILLED[name][0], ICON_FILLED[name][1]);
}

// ---------- A3: components ----------

async function buildChip() {
  const row = boardRow('Chip', 'Pill 36px tall inside a 44px hit area. Body/14 Medium, 16px side padding.');
  const variants = [];
  for (const state of ['Active', 'Inactive']) {
    const active = state === 'Active';
    const c = comp('State=' + state, 'HORIZONTAL');
    pad(c, 4, 0, 4, 0); // 4 + 36 + 4 = 44px touch target
    const pill = auto('Pill', 'HORIZONTAL');
    center(pill); pad(pill, 0, 16, 0, 16);
    pill.resize(64, 36); pill.primaryAxisSizingMode = 'AUTO'; pill.counterAxisSizingMode = 'FIXED';
    radius(pill, 'pill'); fill(pill, active ? 'surface/dark' : 'surface/card');
    pill.appendChild(await text('Asia', 'Body/14 Medium', active ? 'text/inverse' : 'text/secondary', 'Label'));
    c.appendChild(pill);
    variants.push(c);
  }
  const set = figma.combineAsVariants(variants, row);
  set.name = 'Chip'; styleSet(set, 'HORIZONTAL');
  bindText(set, 'Label', 'Label', 'Asia');
  set.description = 'Filter / tab chip. Active = surface/dark + text/inverse, Inactive = surface/card + text/secondary. 44px tall hit area.';
  SET.Chip = set;
}

async function buildButton() {
  const row = boardRow('Button', 'Height 52, pill radius, Body/14 Medium. Primary uses accent/strong (5.3:1 with white).');
  const variants = [];
  for (const style of ['Primary', 'Dark', 'Ghost']) {
    const c = comp('Style=' + style, 'HORIZONTAL');
    center(c); gap(c, 8); pad(c, 0, 24, 0, 24);
    c.resize(140, 52); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED';
    radius(c, 'pill');
    const color = style === 'Ghost' ? 'text/primary' : 'text/inverse';
    if (style === 'Primary') fill(c, 'accent/strong');
    else if (style === 'Dark') fill(c, 'surface/dark');
    c.appendChild(await text('Book now', 'Body/14 Medium', color, 'Label'));
    const ic = icon('Arrow Right', color, 20);
    ic.visible = false;
    c.appendChild(ic);
    variants.push(c);
  }
  const set = figma.combineAsVariants(variants, row);
  set.name = 'Button'; styleSet(set, 'HORIZONTAL');
  bindText(set, 'Label', 'Label', 'Book now');
  bindBool(set, 'Icon', 'Show icon', false);
  bindSwap(set, 'Icon', 'Icon', 'Arrow Right');
  set.description = 'Primary (accent/strong), Dark (surface/dark), Ghost (transparent). Optional trailing icon.';
  SET.Button = set;
}

async function buildIconButton() {
  const row = boardRow('IconButton', '40px circle inside a 44px hit area. Light = white + shadow (for photos), Dark = surface/dark.');
  const ICONS = { Back: 'Arrow Left', Heart: 'Heart', HeartFilled: 'Heart Filled', Arrow: 'Arrow Right' };
  const variants = [];
  for (const style of ['Light', 'Dark']) {
    for (const key of Object.keys(ICONS)) {
      const c = comp('Style=' + style + ', Icon=' + key, 'HORIZONTAL');
      center(c); fixed(c, 44, 44);
      const circle = auto('Circle', 'HORIZONTAL');
      center(circle); fixed(circle, 40, 40);
      radius(circle, 'pill');
      fill(circle, style === 'Light' ? 'surface/background' : 'surface/dark');
      if (style === 'Light') circle.effects = [SHADOW_SOFT];
      const iconColor = key === 'HeartFilled' ? null : (style === 'Light' ? 'text/primary' : 'text/inverse');
      circle.appendChild(icon(ICONS[key], iconColor, 20));
      c.appendChild(circle);
      variants.push(c);
    }
  }
  const set = figma.combineAsVariants(variants, row);
  set.name = 'IconButton'; styleSet(set, 'HORIZONTAL', 320);
  set.description = 'Round icon button. Style=Light/Dark × Icon=Back/Heart/HeartFilled/Arrow. 44×44 touch target.';
  SET.IconButton = set;
}

async function buildRatingBadge() {
  const row = boardRow('RatingBadge', 'Filled star (status/rating) + rating in Micro/12, pill with border/subtle.');
  const c = comp('RatingBadge', 'HORIZONTAL');
  c.counterAxisAlignItems = 'CENTER'; gap(c, 4); pad(c, 4, 8, 4, 8);
  radius(c, 'pill'); fill(c, 'surface/background'); stroke(c, 'border/subtle', 1);
  c.appendChild(icon('Star Filled', null, 14));
  c.appendChild(await text('4.9', 'Micro/12 Medium', 'text/primary', 'Rating'));
  stage(row).appendChild(c);
  bindText(c, 'Rating', 'Rating', '4.9');
  c.description = 'Rating pill: filled star + value.';
  SET.RatingBadge = c;
}

async function buildStatusBadge() {
  const row = boardRow('StatusBadge', 'Soft background, status dot, Micro/12 label. No emoji.');
  // [background, dot, text]
  const CFG = {
    Confirmed: ['accent/soft', 'status/success', 'accent/strong'],
    Pending: ['status/warning-soft', 'status/warning', 'status/warning'],
    // red text on the soft red background is only ~4.0:1, so the label stays text/primary
    Cancelled: ['status/error-soft', 'status/error', 'text/primary'],
  };
  const variants = [];
  for (const status of Object.keys(CFG)) {
    const c = comp('Status=' + status, 'HORIZONTAL');
    c.counterAxisAlignItems = 'CENTER'; gap(c, 8); pad(c, 4, 12, 4, 12);
    radius(c, 'pill'); fill(c, CFG[status][0]);
    const dot = figma.createEllipse(); dot.name = 'Dot'; dot.resize(8, 8); fill(dot, CFG[status][1]);
    c.appendChild(dot);
    c.appendChild(await text(status, 'Micro/12 Medium', CFG[status][2], 'Label'));
    variants.push(c);
  }
  const set = figma.combineAsVariants(variants, row);
  set.name = 'StatusBadge'; styleSet(set, 'HORIZONTAL');
  set.description = 'Booking status. Confirmed / Pending / Cancelled.';
  SET.StatusBadge = set;
}

async function buildListRow() {
  const row = boardRow('ListRow', 'Icon left, Body/15 label, chevron right, 56px tall, optional divider.');
  const c = comp('ListRow', 'HORIZONTAL');
  c.counterAxisAlignItems = 'CENTER'; gap(c, 16); fixed(c, 353, 56);
  fill(c, 'surface/background');
  c.appendChild(icon('User', 'text/primary', 24));
  const label = await text('Profile', 'Body/15 Regular', 'text/primary', 'Label');
  c.appendChild(label); fillWidth(label, 1);
  const chevron = icon('Chevron Right', 'text/secondary', 20);
  chevron.name = 'Chevron';
  c.appendChild(chevron);
  const divider = figma.createRectangle();
  divider.name = 'Divider'; divider.resize(353, 1); fill(divider, 'border/subtle');
  c.appendChild(divider);
  divider.layoutPositioning = 'ABSOLUTE'; divider.x = 0; divider.y = 55;
  divider.constraints = { horizontal: 'STRETCH', vertical: 'MAX' };
  stage(row).appendChild(c);
  bindText(c, 'Label', 'Label', 'Profile');
  bindSwap(c, 'Icon', 'Icon', 'User');
  bindBool(c, 'Divider', 'Divider', true);
  c.description = 'Settings / More list row.';
  SET.ListRow = c;
}

async function buildInclusionRow() {
  const row = boardRow('InclusionRow', 'Left-aligned: icon in accent/soft circle + Subheading/16 title + Caption/13 detail.');
  const c = comp('InclusionRow', 'HORIZONTAL');
  c.counterAxisAlignItems = 'CENTER'; gap(c, 16); pad(c, 12, 0, 12, 0);
  c.resize(353, 72); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO';
  const circle = auto('Icon circle', 'HORIZONTAL');
  center(circle); fixed(circle, 48, 48); radius(circle, 'pill'); fill(circle, 'accent/soft');
  circle.appendChild(icon('Building', 'accent/strong', 24));
  c.appendChild(circle);
  const stack = auto('Text', 'VERTICAL'); gap(stack, 4);
  c.appendChild(stack); stack.layoutSizingHorizontal = 'FILL';
  const title = await text('Accommodation', 'Subheading/16 Semibold', 'text/primary', 'Title');
  stack.appendChild(title); fillWidth(title, 1);
  const detail = await text('4-star hotel, 3 nights', 'Caption/13 Regular', 'text/secondary', 'Detail');
  stack.appendChild(detail); fillWidth(detail, 1);
  stage(row).appendChild(c);
  bindText(c, 'Title', 'Title', 'Accommodation');
  bindText(c, 'Detail', 'Detail', '4-star hotel, 3 nights');
  bindSwap(c, 'Icon', 'Icon', 'Building');
  c.description = 'What\'s Included row.';
  SET.InclusionRow = c;
}

async function buildNavBar() {
  const row = boardRow('NavBar', 'Floating dark pill. Active tab = white circle behind the icon + label beside it. Inactive icons 24px white.');
  const TABS = [['Home', 'Home'], ['Trips', 'Calendar'], ['Saved', 'Heart'], ['More', 'Grid']];
  const variants = [];
  for (const active of ['Home', 'Trips', 'Saved', 'More']) {
    const c = comp('Active=' + active, 'HORIZONTAL');
    c.primaryAxisAlignItems = 'SPACE_BETWEEN'; c.counterAxisAlignItems = 'CENTER';
    pad(c, 12, 16, 12, 16); fixed(c, 353, 72);
    radius(c, 'pill'); fill(c, 'surface/dark'); c.effects = [SHADOW_NAV];
    for (const tabDef of TABS) {
      const label = tabDef[0], iconName = tabDef[1];
      const tab = auto('Tab / ' + label, 'HORIZONTAL');
      tab.counterAxisAlignItems = 'CENTER';
      if (label === active) {
        gap(tab, 8); pad(tab, 0, 12, 0, 0);
        const circle = auto('Active circle', 'HORIZONTAL');
        center(circle); fixed(circle, 48, 48); radius(circle, 'pill'); fill(circle, 'surface/background');
        circle.appendChild(icon(iconName, 'text/primary', 24));
        tab.appendChild(circle);
        tab.appendChild(await text(label, 'Micro/12 Medium', 'text/inverse', 'Label'));
      } else {
        center(tab); fixed(tab, 48, 48);
        tab.appendChild(icon(iconName, 'text/inverse', 24));
      }
      c.appendChild(tab);
    }
    variants.push(c);
  }
  const set = figma.combineAsVariants(variants, row);
  set.name = 'NavBar'; styleSet(set, 'VERTICAL');
  set.description = 'Bottom tab bar (floats 20px above the bottom). Active=Home/Trips/Saved/More.';
  SET.NavBar = set;
}

async function buildEmptyState() {
  const row = boardRow('EmptyState', 'Illustration slot (96px icon in accent/soft circle), title, message (text/secondary, 5.3:1), button 16px below.');
  const c = comp('EmptyState', 'VERTICAL');
  c.counterAxisAlignItems = 'CENTER'; gap(c, 16);
  c.resize(353, 400); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED';
  const slotWrap = auto('Illustration', 'VERTICAL');
  pad(slotWrap, 0, 0, 8, 0); // 8 + 16 gap = 24 below the illustration
  const slot = auto('Illustration circle', 'HORIZONTAL');
  center(slot); fixed(slot, 160, 160); radius(slot, 'pill'); fill(slot, 'accent/soft');
  slot.appendChild(icon('Luggage', 'accent/strong', 96));
  slotWrap.appendChild(slot);
  c.appendChild(slotWrap);
  const copy = auto('Copy', 'VERTICAL');
  copy.counterAxisAlignItems = 'CENTER'; gap(copy, 8);
  const title = await text('No trips yet', 'Subheading/16 Semibold', 'text/primary', 'Title');
  title.textAlignHorizontal = 'CENTER';
  copy.appendChild(title);
  const msg = await text('Plan your first adventure — explore destinations and book an experience.', 'Body/14 Medium', 'text/secondary', 'Message');
  msg.textAlignHorizontal = 'CENTER'; msg.textAutoResize = 'HEIGHT'; msg.resize(280, msg.height);
  copy.appendChild(msg);
  c.appendChild(copy);
  c.appendChild(setProps(variant('Button', 'Style=Primary'), { Label: 'Explore destinations', 'Show icon': true }));
  stage(row).appendChild(c);
  bindText(c, 'Title', 'Title', 'No trips yet');
  bindText(c, 'Message', 'Message', 'Plan your first adventure — explore destinations and book an experience.');
  bindSwap(c, 'Icon', 'Icon', 'Luggage');
  c.description = 'Empty list state. Text always sits below the illustration; button directly under the message.';
  SET.EmptyState = c;
}

async function buildDayCard() {
  const row = boardRow('DayCard', 'Image 120×88 left; Day label, title, 2-line description right. Fixed 112px height.');
  const c = comp('DayCard', 'HORIZONTAL');
  c.counterAxisAlignItems = 'CENTER'; gap(c, 12); pad(c, 12, 12, 12, 12); fixed(c, 353, 112);
  fill(c, 'surface/background'); stroke(c, 'border/subtle', 1); radius(c, 'card');
  c.appendChild(await imageRect('Image', 120, 88, 'day1'));
  const stack = auto('Text', 'VERTICAL'); gap(stack, 4);
  c.appendChild(stack); stack.layoutSizingHorizontal = 'FILL';
  const day = await text('Day 1', 'Micro/12 Medium', 'text/secondary', 'Day');
  stack.appendChild(day);
  const title = await text('Arrival & City Introduction', 'Subheading/16 Semibold', 'text/primary', 'Title');
  stack.appendChild(title); fillWidth(title, 1);
  const desc = await text('Arrive in Tokyo and enjoy a relaxed evening walk through the local neighborhood.', 'Body/14 Medium', 'text/secondary', 'Description');
  stack.appendChild(desc); fillWidth(desc, 2);
  stage(row).appendChild(c);
  bindText(c, 'Day', 'Day', 'Day 1');
  bindText(c, 'Title', 'Title', 'Arrival & City Introduction');
  bindText(c, 'Description', 'Description', 'Arrive in Tokyo and enjoy a relaxed evening walk through the local neighborhood.');
  c.description = 'Itinerary day. Swap the image fill per instance.';
  SET.DayCard = c;
}

async function buildExperienceCard() {
  const row = boardRow('ExperienceCard', 'Image (radius/sm inside a 16px card), title, "4 days · from $999/person", rating + reviews, dark arrow button.');
  const c = comp('ExperienceCard', 'VERTICAL');
  gap(c, 12); pad(c, 8, 8, 12, 8);
  c.resize(256, 300); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED';
  fill(c, 'surface/background'); stroke(c, 'border/subtle', 1); radius(c, 'card');
  const img = await imageRect('Image', 240, 150, 'fuji');
  c.appendChild(img); img.layoutSizingHorizontal = 'FILL';
  const content = auto('Content', 'VERTICAL'); gap(content, 8); pad(content, 0, 4, 0, 4);
  c.appendChild(content); content.layoutSizingHorizontal = 'FILL';
  const titleBlock = auto('Title block', 'VERTICAL'); gap(titleBlock, 4);
  content.appendChild(titleBlock); titleBlock.layoutSizingHorizontal = 'FILL';
  const title = await text('Tokyo Essentials', 'Subheading/16 Semibold', 'text/primary', 'Title');
  titleBlock.appendChild(title); fillWidth(title, 1);
  const meta = await text('4 days · from $999/person', 'Caption/13 Regular', 'text/secondary', 'Meta');
  titleBlock.appendChild(meta); fillWidth(meta, 1);
  const footer = auto('Footer', 'HORIZONTAL');
  footer.primaryAxisAlignItems = 'SPACE_BETWEEN'; footer.counterAxisAlignItems = 'CENTER';
  content.appendChild(footer); footer.layoutSizingHorizontal = 'FILL';
  const ratingGroup = auto('Rating', 'HORIZONTAL'); ratingGroup.counterAxisAlignItems = 'CENTER'; gap(ratingGroup, 8);
  const badge = setProps(SET.RatingBadge.createInstance(), { Rating: '4.8' });
  badge.name = 'RatingBadge';
  ratingGroup.appendChild(badge);
  ratingGroup.appendChild(await text('169 reviews', 'Micro/12 Medium', 'text/secondary', 'Reviews'));
  footer.appendChild(ratingGroup);
  const arrow = variant('IconButton', 'Style=Dark, Icon=Arrow'); arrow.name = 'Open';
  footer.appendChild(arrow);
  stage(row).appendChild(c);
  bindText(c, 'Title', 'Title', 'Tokyo Essentials');
  bindText(c, 'Meta', 'Meta', '4 days · from $999/person');
  bindText(c, 'Reviews', 'Reviews', '169 reviews');
  badge.isExposedInstance = true;
  c.description = 'Experience card. Meta format: "<n> days · from $<price>/person".';
  SET.ExperienceCard = c;
}

async function buildHeroCard() {
  const row = boardRow('DestinationHeroCard', 'Stacked carousel card: photo, gradient, country, city, rating + reviews, heart, glass "Explore destination" button.');
  const W = 264, H = 368;
  const c = comp('DestinationHeroCard', 'VERTICAL');
  c.primaryAxisAlignItems = 'SPACE_BETWEEN'; pad(c, 16, 16, 16, 16); fixed(c, W, H);
  radius(c, 'sheet'); c.clipsContent = true;
  const photo = await imagePaint('kyoto');
  if (photo) c.fills = [photo]; else fill(c, 'surface/dark');

  const top = auto('Top bar', 'HORIZONTAL'); top.primaryAxisAlignItems = 'MAX';
  c.appendChild(top); top.layoutSizingHorizontal = 'FILL';
  const heart = variant('IconButton', 'Style=Light, Icon=Heart'); heart.name = 'Like';
  top.appendChild(heart);

  const details = auto('Details', 'VERTICAL'); gap(details, 12);
  c.appendChild(details); details.layoutSizingHorizontal = 'FILL';
  const info = auto('Info', 'VERTICAL'); gap(info, 4);
  details.appendChild(info);
  info.appendChild(await text('Japan', 'Caption/13 Regular', 'text/inverse', 'Country'));
  info.appendChild(await text('Tokyo', 'Title/22 Semibold', 'text/inverse', 'City'));
  const ratingRow = auto('Rating', 'HORIZONTAL'); ratingRow.counterAxisAlignItems = 'CENTER'; gap(ratingRow, 8);
  const badge = setProps(SET.RatingBadge.createInstance(), { Rating: '4.9' });
  badge.name = 'RatingBadge';
  ratingRow.appendChild(badge);
  ratingRow.appendChild(await text('267 reviews', 'Micro/12 Medium', 'text/inverse', 'Reviews'));
  info.appendChild(ratingRow);

  const glass = auto('Explore button', 'HORIZONTAL');
  glass.primaryAxisAlignItems = 'SPACE_BETWEEN'; glass.counterAxisAlignItems = 'CENTER';
  pad(glass, 4, 4, 4, 20); radius(glass, 'pill');
  glass.fills = [paint('text/inverse', 0.18)];
  glass.strokes = [paint('text/inverse', 0.35)]; glass.strokeWeight = 1; glass.strokeAlign = 'INSIDE';
  try { glass.effects = [{ type: 'BACKGROUND_BLUR', radius: 16, visible: true }]; } catch (e) { /* blur is cosmetic */ }
  details.appendChild(glass); glass.layoutSizingHorizontal = 'FILL';
  glass.appendChild(await text('Explore destination', 'Body/14 Medium', 'text/inverse', 'Label'));
  const arrowCircle = auto('Arrow', 'HORIZONTAL');
  center(arrowCircle); fixed(arrowCircle, 44, 44); radius(arrowCircle, 'pill'); fill(arrowCircle, 'surface/background');
  arrowCircle.appendChild(icon('Arrow Right', 'text/primary', 20));
  glass.appendChild(arrowCircle);

  // gradient overlay behind the content, so white text stays readable on any photo
  const grad = figma.createRectangle();
  grad.name = 'Gradient overlay';
  c.appendChild(grad);
  grad.layoutPositioning = 'ABSOLUTE';
  grad.resize(W, H); grad.x = 0; grad.y = 0;
  grad.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
  grad.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[0, 1, 0], [-1, 0, 1]],
    gradientStops: [
      { position: 0, color: { r: 0, g: 0, b: 0, a: 0 } },
      { position: 0.4, color: { r: 0, g: 0, b: 0, a: 0 } },
      { position: 1, color: { r: 0, g: 0, b: 0, a: 0.75 } },
    ],
  }];
  c.insertChild(0, grad);

  stage(row).appendChild(c);
  bindText(c, 'Country', 'Country', 'Japan');
  bindText(c, 'City', 'City', 'Tokyo');
  bindText(c, 'Reviews', 'Reviews', '267 reviews');
  badge.isExposedInstance = true;
  c.description = 'Homepage carousel card. Swap the photo fill per instance.';
  SET.DestinationHeroCard = c;
}

async function buildStickyBookingBar() {
  const row = boardRow('StickyBookingBar', 'White bar with top border: "from" + price left, Primary "Book now" right, 32px bottom safe area.');
  const c = comp('StickyBookingBar', 'HORIZONTAL');
  c.primaryAxisAlignItems = 'SPACE_BETWEEN'; c.counterAxisAlignItems = 'CENTER';
  pad(c, 12, 20, 32, 20);
  c.resize(393, 100); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO';
  fill(c, 'surface/background');
  c.strokes = [paint('border/subtle')]; c.strokeAlign = 'INSIDE';
  c.strokeTopWeight = 1; c.strokeBottomWeight = 0; c.strokeLeftWeight = 0; c.strokeRightWeight = 0;
  const price = auto('Price', 'VERTICAL');
  price.appendChild(await text('from', 'Caption/13 Regular', 'text/secondary', 'Prefix'));
  price.appendChild(await text('$999 / person', 'Subheading/16 Semibold', 'text/primary', 'Amount'));
  c.appendChild(price);
  const btn = setProps(variant('Button', 'Style=Primary'), { Label: 'Book now' });
  btn.name = 'Book button';
  c.appendChild(btn);
  btn.resize(160, 52);
  stage(row).appendChild(c);
  bindText(c, 'Prefix', 'Prefix', 'from');
  bindText(c, 'Amount', 'Amount', '$999 / person');
  btn.isExposedInstance = true;
  c.description = 'Sticky footer on experience + booking screens. Includes the bottom safe area.';
  SET.StickyBookingBar = c;
}

// ---------- A4: screen rebuild ----------

const SCREENS = {
  'Loading Screen': '2667:365', 'Homepage': '2645:103', 'Explore Destination': '2645:104',
  'Popular experiences 1': '2645:105', 'Popular experiences 2': '2645:106', 'Trips Empty': '2685:64',
  'Trips With Trips v2': '2695:5095', 'Saved Empty': '2695:5169', 'More': '2695:5252',
};
// image layers on the original screens (harvested before anything is changed)
const IMG_IDS = {
  kyoto: '2660:266', kyotoTall: '2660:10263', alt1: '2660:331', alt2: '2660:10171', avatar: '2657:226',
  fuji: '2662:10371', culture: '2662:10320', day1: '2665:10418', dayA: '2667:74', dayB: '2667:79',
  trip: '2695:5141', qr: '2695:5164',
};
const IMG = {}; // key -> IMAGE paint
const SW = 393, SH = 852;
const NOTES = [];

async function loadComponents(page) {
  const section = page.children.find(function (n) { return n.type === 'SECTION' && n.name === 'Components'; });
  if (!section) throw new Error('No "Components" section on this page. Run A3 first.');
  section.findAll(function (n) {
    return n.type === 'COMPONENT_SET' || (n.type === 'COMPONENT' && n.parent.type !== 'COMPONENT_SET');
  }).forEach(function (n) {
    if (n.name.indexOf('Icon/') === 0) ICON[n.name.slice(5)] = n; else SET[n.name] = n;
  });
  const need = ['Chip', 'Button', 'IconButton', 'RatingBadge', 'StatusBadge', 'ListRow', 'InclusionRow', 'NavBar',
    'EmptyState', 'DayCard', 'ExperienceCard', 'DestinationHeroCard', 'StickyBookingBar'];
  const missing = need.filter(function (n) { return !SET[n]; });
  ['Heart', 'User', 'Card', 'Bell', 'Help', 'Settings', 'Logout', 'Search', 'Filter', 'Location', 'Building', 'Bus', 'People', 'Coffee']
    .forEach(function (n) { if (!ICON[n]) missing.push('Icon/' + n); });
  if (missing.length) throw new Error('Components missing (re-run A3?): ' + missing.join(', '));
}

async function harvestImages() {
  for (const key of Object.keys(IMG_IDS)) {
    const node = await figma.getNodeByIdAsync(IMG_IDS[key]);
    if (node && 'fills' in node && Array.isArray(node.fills)) {
      const img = node.fills.find(function (p) { return p.type === 'IMAGE'; });
      if (img) { IMG[key] = Object.assign({}, img, { scaleMode: 'FILL' }); IMG[key + 'Y'] = node.absoluteTransform[1][2]; }
    }
    if (!IMG[key]) NOTES.push('Image "' + key + '" (' + IMG_IDS[key] + ') not found — grey placeholder used.');
  }
  // the two unlabelled day images: the higher one on the screen is Day 2
  if (IMG.dayA && IMG.dayB && IMG.dayAY > IMG.dayBY) { const t = IMG.dayA; IMG.dayA = IMG.dayB; IMG.dayB = t; }
}
function img(key) { return IMG[key] ? [IMG[key]] : [paint('surface/card')]; }

// ----- layout helpers -----

function shell(f, spacing) {
  f.layoutMode = 'VERTICAL';
  f.resize(SW, SH);
  f.primaryAxisSizingMode = 'FIXED'; f.counterAxisSizingMode = 'FIXED';
  f.primaryAxisAlignItems = 'MIN'; f.counterAxisAlignItems = 'MIN';
  f.paddingTop = 0; f.paddingBottom = 0; f.paddingLeft = 0; f.paddingRight = 0;
  f.itemSpacing = spacing || 0;
  fill(f, 'surface/background');
  f.clipsContent = true;
  try { f.overflowDirection = 'VERTICAL'; } catch (e) { /* prototype-only */ }
}
function padX(n) {
  n.paddingLeft = 20; n.paddingRight = 20;
  n.setBoundVariable('paddingLeft', V['space/screen-x']); n.setBoundVariable('paddingRight', V['space/screen-x']);
}
function topRadius(n, key) {
  const v = V['radius/' + key];
  n.setBoundVariable('topLeftRadius', v); n.setBoundVariable('topRightRadius', v);
  n.bottomLeftRadius = 0; n.bottomRightRadius = 0;
}
function append(parent, child, fillW) {
  parent.appendChild(child);
  if (fillW) child.layoutSizingHorizontal = 'FILL';
  return child;
}
function absolute(f, node, x, y, constraints) {
  f.appendChild(node);
  node.layoutPositioning = 'ABSOLUTE';
  node.x = x; node.y = y;
  if (constraints) node.constraints = constraints;
  try { node.scrollBehavior = 'FIXED'; } catch (e) { /* older API */ }
  return node;
}
// flow content column with 20px screen padding
function column(f, name, top, bottom, spacing) {
  const c = auto(name, 'VERTICAL');
  append(f, c, true);
  padX(c); c.paddingTop = top; c.paddingBottom = bottom;
  if (V['space/' + top]) c.setBoundVariable('paddingTop', V['space/' + top]);
  gap(c, spacing);
  return c;
}
function addNav(f, active) {
  const n = variant('NavBar', 'Active=' + active); n.name = 'NavBar';
  absolute(f, n, 20, SH - 72 - 28, { horizontal: 'CENTER', vertical: 'MAX' });
}
function addHomeIndicator(f) {
  const r = figma.createRectangle();
  r.name = 'Home indicator'; r.resize(134, 5); radius(r, 'pill'); fill(r, 'text/primary');
  absolute(f, r, (SW - 134) / 2, SH - 8 - 5, { horizontal: 'CENTER', vertical: 'MAX' });
}
function addBookingBar(f) {
  const b = SET.StickyBookingBar.createInstance(); b.name = 'StickyBookingBar';
  absolute(f, b, 0, SH - b.height, { horizontal: 'STRETCH', vertical: 'MAX' });
}
async function sectionHeader(parent, title, link) {
  const row = auto('Header / ' + title, 'HORIZONTAL');
  row.primaryAxisAlignItems = 'SPACE_BETWEEN'; row.counterAxisAlignItems = 'CENTER';
  append(parent, row, true);
  row.appendChild(await text(title, 'Heading/18 Semibold', 'text/primary', 'Title'));
  if (link) {
    const l = auto('Link', 'HORIZONTAL'); l.counterAxisAlignItems = 'CENTER';
    l.resize(60, 44); l.counterAxisSizingMode = 'FIXED'; l.primaryAxisSizingMode = 'AUTO';
    l.appendChild(await text(link, 'Body/14 Medium', 'accent/strong', 'Label'));
    row.appendChild(l);
  }
  return row;
}
function hScroll(parent, name) {
  const r = auto(name, 'HORIZONTAL'); gap(r, 16);
  parent.appendChild(r); // hugs its cards and runs off the right edge like a carousel
  return r;
}
function setRating(inst, value) {
  const ex = (inst.exposedInstances || []).find(function (n) { return n.name === 'RatingBadge'; });
  if (ex) setProps(ex, { Rating: value });
}
function setLayerFill(inst, layerName, paints) {
  const n = inst.findOne(function (x) { return x.name === layerName && 'fills' in x; });
  if (n) n.fills = paints;
}
function expCard(o) {
  const c = SET.ExperienceCard.createInstance(); c.name = 'ExperienceCard / ' + o.title;
  setProps(c, { Title: o.title, Meta: o.meta, Reviews: o.reviews });
  setLayerFill(c, 'Image', img(o.img));
  setRating(c, o.rating);
  c.resize(280, c.height); c.primaryAxisSizingMode = 'AUTO'; // room for "4 days · 3 nights · from $999/person"
  return c;
}
const TOKYO_ESSENTIALS = { title: 'Tokyo Essentials', meta: '4 days · 3 nights · from $999/person', reviews: '169 reviews', rating: '4.8', img: 'fuji' };
const CULTURE_CUISINE = { title: 'Culture & Cuisine', meta: '3 days · 2 nights · from $890/person', reviews: '128 reviews', rating: '4.7', img: 'culture' };

function chip(label, active) {
  return setProps(variant('Chip', 'State=' + (active ? 'Active' : 'Inactive')), { Label: label });
}
async function pageTitle(parent, title) {
  const t = await text(title, 'Display/28 Bold', 'text/primary', 'Title');
  parent.appendChild(t);
  return t;
}
async function segmented(parent, active) {
  const s = auto('Segmented tabs', 'HORIZONTAL');
  pad(s, 4, 4, 4, 4); gap(s, 4); radius(s, 'pill'); fill(s, 'surface/card');
  append(parent, s, true);
  for (const label of ['Upcoming', 'Past']) {
    const on = label === active;
    const seg = auto('Tab / ' + label, 'HORIZONTAL'); center(seg);
    seg.resize(100, 40); seg.primaryAxisSizingMode = 'FIXED'; seg.counterAxisSizingMode = 'FIXED';
    radius(seg, 'pill');
    if (on) { fill(seg, 'surface/background'); seg.effects = [SHADOW_SOFT]; }
    seg.appendChild(await text(label, 'Body/14 Medium', on ? 'text/primary' : 'text/secondary', 'Label'));
    append(s, seg, true);
  }
}
function emptyState(o) {
  const es = SET.EmptyState.createInstance(); es.name = 'EmptyState';
  const props = { Title: o.title, Message: o.message };
  if (o.icon) props.Icon = ICON[o.icon].id;
  setProps(es, props);
  if (o.icon) {
    const ic = es.findOne(function (n) { return n.type === 'INSTANCE' && n.name === 'Icon' && n.parent && n.parent.name === 'Illustration circle'; });
    if (ic) {
      recolor(ic, 'accent/strong');
      try { if (Math.abs(ic.width - 96) > 1) ic.rescale(96 / ic.width); } catch (e) { NOTES.push('EmptyState icon size could not be overridden (' + o.icon + ').'); }
    }
  }
  return es;
}
function grabber(parent) {
  const w = auto('Grabber', 'HORIZONTAL'); w.primaryAxisAlignItems = 'CENTER';
  append(parent, w, true);
  const g = figma.createRectangle(); g.name = 'Handle'; g.resize(40, 4); radius(g, 'pill'); fill(g, 'border/subtle');
  w.appendChild(g);
}
function sheet(f, name, minHeight, bottom) {
  const s = auto(name, 'VERTICAL');
  append(f, s, true);
  padX(s); s.paddingTop = 12; s.paddingBottom = bottom;
  s.setBoundVariable('paddingTop', V['space/12']);
  gap(s, 16); topRadius(s, 'sheet'); fill(s, 'surface/background');
  s.minHeight = minHeight;
  return s;
}

// ----- screens -----

async function buildHomepage(f) {
  shell(f);
  const c = column(f, 'Content', 8, 120, 24);

  const header = auto('Greeting', 'HORIZONTAL');
  header.primaryAxisAlignItems = 'SPACE_BETWEEN'; header.counterAxisAlignItems = 'CENTER';
  append(c, header, true);
  const hello = auto('Text', 'VERTICAL'); gap(hello, 4);
  header.appendChild(hello);
  hello.appendChild(await text('Hello, Sreeraj', 'Display/28 Bold', 'text/primary', 'Greeting'));
  hello.appendChild(await text('Where would you like to go next?', 'Body/14 Medium', 'text/secondary', 'Subtitle'));
  const avatar = figma.createEllipse(); avatar.name = 'Avatar'; avatar.resize(44, 44); avatar.fills = img('avatar');
  header.appendChild(avatar);

  const searchRow = auto('Search row', 'HORIZONTAL'); gap(searchRow, 12); searchRow.counterAxisAlignItems = 'CENTER';
  append(c, searchRow, true);
  const search = auto('Search bar', 'HORIZONTAL'); search.counterAxisAlignItems = 'CENTER';
  gap(search, 8); pad(search, 0, 16, 0, 16); radius(search, 'pill'); fill(search, 'surface/card');
  search.resize(290, 48); search.counterAxisSizingMode = 'FIXED';
  append(searchRow, search, true);
  search.appendChild(icon('Search', 'text/secondary', 20));
  const ph = await text('Search destinations or experiences', 'Body/14 Medium', 'text/secondary', 'Placeholder');
  search.appendChild(ph); fillWidth(ph, 1);
  const filter = auto('Filter button', 'HORIZONTAL'); center(filter); fixed(filter, 48, 48);
  radius(filter, 'pill'); fill(filter, 'surface/dark');
  filter.appendChild(icon('Filter', 'text/inverse', 20));
  searchRow.appendChild(filter);

  const pick = auto('Continents', 'VERTICAL'); gap(pick, 12);
  append(c, pick, true);
  pick.appendChild(await text('Select your next trip', 'Heading/18 Semibold', 'text/primary', 'Title'));
  const chips = hScroll(pick, 'Chips'); gap(chips, 8);
  [['Asia', true], ['Europe'], ['Africa'], ['North America'], ['South America']].forEach(function (d) { chips.appendChild(chip(d[0], !!d[1])); });

  const carousel = hScroll(c, 'Destination carousel');
  const tokyo = SET.DestinationHeroCard.createInstance(); tokyo.name = 'DestinationHeroCard / Tokyo';
  carousel.appendChild(tokyo);
  const kyoto = SET.DestinationHeroCard.createInstance(); kyoto.name = 'DestinationHeroCard / Kyoto';
  setProps(kyoto, { Country: 'Japan', City: 'Kyoto', Reviews: '198 reviews' });
  setRating(kyoto, '4.8');
  if (IMG.alt1) kyoto.fills = [IMG.alt1];
  carousel.appendChild(kyoto);

  const trending = auto('Trending experiences', 'VERTICAL'); gap(trending, 12);
  append(c, trending, true);
  await sectionHeader(trending, 'Trending experiences', 'View all');
  const row = hScroll(trending, 'Experience row');
  row.appendChild(expCard(TOKYO_ESSENTIALS));
  row.appendChild(expCard(CULTURE_CUISINE));

  addNav(f, 'Home');
  addHomeIndicator(f);
  return 'flow';
}

async function buildExplore(f) {
  shell(f, -24); // the sheet overlaps the photo by 24px
  const hero = auto('Hero', 'VERTICAL');
  append(f, hero, true);
  hero.resize(SW, 394); hero.primaryAxisSizingMode = 'FIXED';
  hero.fills = img('kyotoTall');
  padX(hero); hero.paddingTop = 52;
  const bar = auto('Top bar', 'HORIZONTAL'); bar.primaryAxisAlignItems = 'SPACE_BETWEEN';
  append(hero, bar, true);
  const back = variant('IconButton', 'Style=Light, Icon=Back'); back.name = 'Back'; bar.appendChild(back);
  const like = variant('IconButton', 'Style=Light, Icon=Heart'); like.name = 'Like'; bar.appendChild(like);

  const s = sheet(f, 'Sheet', SH - 370, 40);
  grabber(s);
  const intro = auto('Intro', 'VERTICAL'); gap(intro, 8);
  append(s, intro, true);
  const titleRow = auto('Title row', 'HORIZONTAL'); titleRow.counterAxisAlignItems = 'CENTER'; gap(titleRow, 8);
  append(intro, titleRow, true);
  const city = await text('Tokyo', 'Title/22 Semibold', 'text/primary', 'City');
  titleRow.appendChild(city); fillWidth(city, 1);
  const badge = SET.RatingBadge.createInstance(); badge.name = 'RatingBadge'; titleRow.appendChild(badge);
  const loc = auto('Location', 'HORIZONTAL'); loc.counterAxisAlignItems = 'CENTER'; gap(loc, 4);
  intro.appendChild(loc);
  loc.appendChild(icon('Location', 'text/secondary', 16));
  loc.appendChild(await text('Japan · 267 reviews', 'Caption/13 Regular', 'text/secondary', 'Meta'));

  const about = auto('About', 'VERTICAL'); gap(about, 4);
  append(s, about, true);
  const desc = await text('Tokyo is Japan\'s vibrant capital, a massive, futuristic metropolis blending ancient traditions with neon-lit streets, world-class food and quiet temple gardens.', 'Body/14 Medium', 'text/secondary', 'Description');
  about.appendChild(desc); fillWidth(desc, 3);
  const more = auto('Read more', 'HORIZONTAL'); more.counterAxisAlignItems = 'CENTER';
  more.resize(80, 44); more.counterAxisSizingMode = 'FIXED'; more.primaryAxisSizingMode = 'AUTO';
  more.appendChild(await text('Read more', 'Body/14 Medium', 'accent/strong', 'Label'));
  about.appendChild(more);

  await sectionHeader(s, 'Popular experiences', 'View all');
  const row = hScroll(s, 'Experience row');
  row.appendChild(expCard(TOKYO_ESSENTIALS));
  row.appendChild(expCard(CULTURE_CUISINE));
  addHomeIndicator(f);
  return 'overlay';
}

async function experienceShell(f, tab) {
  shell(f, -24);
  const hero = auto('Hero', 'VERTICAL');
  append(f, hero, true);
  hero.resize(SW, 204); hero.primaryAxisSizingMode = 'FIXED';
  // tint keeps the white header readable. Left unbound: Figma drops paint opacity on variable-bound fills
  hero.fills = img('fuji').concat([{ type: 'SOLID', color: { r: 0.12, g: 0.125, b: 0.137 }, opacity: 0.35 }]);
  padX(hero); hero.paddingTop = 52;
  const bar = auto('Header', 'HORIZONTAL'); bar.counterAxisAlignItems = 'CENTER'; gap(bar, 12);
  append(hero, bar, true);
  const back = variant('IconButton', 'Style=Light, Icon=Back'); back.name = 'Back'; bar.appendChild(back);
  const titles = auto('Title', 'VERTICAL'); titles.counterAxisAlignItems = 'CENTER'; gap(titles, 4);
  append(bar, titles, true);
  const t = await text('Tokyo Essentials', 'Subheading/16 Semibold', 'text/inverse', 'Title'); t.textAlignHorizontal = 'CENTER';
  titles.appendChild(t);
  const st = await text('4 days · Guided tour', 'Caption/13 Regular', 'text/inverse', 'Subtitle'); st.textAlignHorizontal = 'CENTER';
  titles.appendChild(st);
  const like = variant('IconButton', 'Style=Light, Icon=Heart'); like.name = 'Like'; bar.appendChild(like);

  const s = sheet(f, 'Sheet', SH - 180, 140);
  grabber(s);
  const tabs = auto('Tabs', 'HORIZONTAL'); gap(tabs, 8);
  s.appendChild(tabs);
  tabs.appendChild(chip('Itinerary', tab === 'Itinerary'));
  tabs.appendChild(chip('What\'s included', tab === 'Included'));
  return s;
}

async function buildPopular1(f) {
  const s = await experienceShell(f, 'Itinerary');
  s.appendChild(await text('4-Day Tokyo Journey', 'Heading/18 Semibold', 'text/primary', 'Heading'));
  const list = auto('Days', 'VERTICAL'); gap(list, 12);
  append(s, list, true);
  const DAYS = [
    ['Day 1', 'Arrival & City Intro', 'Arrive in Tokyo, check in and take a relaxed evening walk through Shinjuku.', 'day1'],
    ['Day 2', 'Historic Tokyo', 'Senso-ji temple, Nakamise street snacks and a river cruise to Hamarikyu Gardens.', 'dayA'],
    ['Day 3', 'Modern City Life', 'Shibuya crossing, Harajuku boutiques and sunset views from Tokyo Skytree.', 'dayB'],
    ['Day 4', 'Departure', 'Breakfast at the hotel, last-minute shopping in Ginza and airport transfer.', 'alt2'],
  ];
  for (const d of DAYS) {
    const card = SET.DayCard.createInstance(); card.name = 'DayCard / ' + d[0];
    setProps(card, { Day: d[0], Title: d[1], Description: d[2] });
    setLayerFill(card, 'Image', img(d[3]));
    append(list, card, true);
  }
  addBookingBar(f);
  addHomeIndicator(f);
  return 'overlay';
}

async function buildPopular2(f) {
  const s = await experienceShell(f, 'Included');
  s.appendChild(await text('What\'s included', 'Heading/18 Semibold', 'text/primary', 'Heading'));
  const list = auto('Inclusions', 'VERTICAL');
  append(s, list, true);
  const ROWS = [
    ['Accommodation', '4-star hotel in Shinjuku, 3 nights', 'Building'],
    ['Local transportation', '72-hour metro pass + airport transfer', 'Bus'],
    ['Guided city tours', 'English-speaking guide on days 2 and 3', 'People'],
    ['Daily breakfast', 'Japanese & western buffet at the hotel', 'Coffee'],
  ];
  for (const r of ROWS) {
    const row = setProps(SET.InclusionRow.createInstance(), { Title: r[0], Detail: r[1], Icon: ICON[r[2]].id });
    row.name = 'InclusionRow / ' + r[0];
    append(list, row, true);
  }
  addBookingBar(f);
  addHomeIndicator(f);
  return 'overlay';
}

async function buildTripsEmpty(f) {
  shell(f);
  const c = column(f, 'Content', 8, 120, 20);
  c.layoutSizingVertical = 'FILL';
  await pageTitle(c, 'Your trips');
  await segmented(c, 'Upcoming');
  const body = auto('Body', 'VERTICAL'); center(body);
  append(c, body, true); body.layoutSizingVertical = 'FILL';
  body.appendChild(emptyState({ title: 'No trips yet', message: 'Plan your first adventure — explore destinations and book an experience.' }));
  addNav(f, 'Trips');
  addHomeIndicator(f);
  return 'flow';
}

async function buildTrips(f) {
  shell(f);
  const c = column(f, 'Content', 8, 120, 20);
  await pageTitle(c, 'Your trips');
  await segmented(c, 'Upcoming');

  const card = auto('Trip card / Tokyo Essentials', 'VERTICAL'); gap(card, 12); pad(card, 12, 12, 12, 12);
  radius(card, 'card'); fill(card, 'surface/background'); stroke(card, 'border/subtle', 1);
  append(c, card, true);
  const top = auto('Summary', 'HORIZONTAL'); gap(top, 12); top.counterAxisAlignItems = 'CENTER';
  append(card, top, true);
  const pic = figma.createRectangle(); pic.name = 'Image'; pic.resize(112, 88); radius(pic, 'sm'); pic.fills = img('trip');
  top.appendChild(pic);
  const info = auto('Info', 'VERTICAL'); gap(info, 4);
  append(top, info, true);
  const tt = await text('Tokyo Essentials', 'Subheading/16 Semibold', 'text/primary', 'Title');
  info.appendChild(tt); fillWidth(tt, 1);
  info.appendChild(await text('Aug 12 – Aug 15 · 4 days', 'Caption/13 Regular', 'text/secondary', 'Dates'));
  const badgeWrap = auto('Status', 'HORIZONTAL'); badgeWrap.paddingTop = 4;
  info.appendChild(badgeWrap);
  const sb = variant('StatusBadge', 'Status=Confirmed'); sb.name = 'StatusBadge'; badgeWrap.appendChild(sb);

  const div = figma.createRectangle(); div.name = 'Divider'; div.resize(329, 1); fill(div, 'border/subtle');
  append(card, div, true);

  const actions = auto('Actions', 'HORIZONTAL');
  actions.primaryAxisAlignItems = 'SPACE_BETWEEN'; actions.counterAxisAlignItems = 'CENTER';
  append(card, actions, true);
  const btn = setProps(variant('Button', 'Style=Dark'), { Label: 'View details', 'Show icon': true });
  btn.name = 'View details'; actions.appendChild(btn);
  const ticket = auto('Ticket', 'VERTICAL'); ticket.counterAxisAlignItems = 'CENTER'; gap(ticket, 4);
  actions.appendChild(ticket);
  const qr = figma.createRectangle(); qr.name = 'QR code'; qr.resize(64, 64);
  qr.fills = IMG.qr ? [Object.assign({}, IMG.qr, { scaleMode: 'FIT' })] : [paint('surface/card')];
  ticket.appendChild(qr);
  ticket.appendChild(await text('Tap to view ticket', 'Micro/12 Medium', 'text/secondary', 'Hint'));

  addNav(f, 'Trips');
  addHomeIndicator(f);
  return 'flow';
}

async function buildSavedEmpty(f) {
  shell(f);
  const c = column(f, 'Content', 8, 120, 20);
  c.layoutSizingVertical = 'FILL';
  await pageTitle(c, 'Saved places');
  const body = auto('Body', 'VERTICAL'); center(body);
  append(c, body, true); body.layoutSizingVertical = 'FILL';
  body.appendChild(emptyState({ title: 'No saved places yet', message: 'Tap the heart on any destination or experience to keep it here.', icon: 'Heart' }));
  addNav(f, 'Saved');
  addHomeIndicator(f);
  return 'flow';
}

async function buildMore(f) {
  shell(f);
  const c = column(f, 'Content', 8, 120, 24);
  await pageTitle(c, 'More');

  const profile = auto('Profile header', 'HORIZONTAL'); profile.counterAxisAlignItems = 'CENTER'; gap(profile, 16);
  append(c, profile, true);
  const av = figma.createEllipse(); av.name = 'Avatar'; av.resize(56, 56); av.fills = img('avatar');
  profile.appendChild(av);
  const who = auto('Info', 'VERTICAL'); gap(who, 4);
  append(profile, who, true);
  who.appendChild(await text('Sreeraj H', 'Subheading/16 Semibold', 'text/primary', 'Name'));
  who.appendChild(await text('sreeraj@example.com', 'Caption/13 Regular', 'text/secondary', 'Email'));
  const edit = await link('Edit profile'); edit.name = 'Edit profile'; who.appendChild(edit); // 44px tall tap area

  const list = auto('Settings list', 'VERTICAL');
  append(c, list, true);
  const ROWS = [['Profile', 'User'], ['Payment methods', 'Card'], ['Notifications', 'Bell'], ['Help & support', 'Help'], ['Settings', 'Settings']];
  ROWS.forEach(function (r, i) {
    const row = setProps(SET.ListRow.createInstance(), { Label: r[0], Icon: ICON[r[1]].id, Divider: i < ROWS.length - 1 });
    row.name = 'ListRow / ' + r[0];
    append(list, row, true);
  });

  const logout = setProps(SET.ListRow.createInstance(), { Label: 'Log out', Icon: ICON.Logout.id, Divider: false });
  logout.name = 'ListRow / Log out';
  append(c, logout, true);
  const lbl = logout.findOne(function (n) { return n.type === 'TEXT' && n.name === 'Label'; });
  if (lbl) lbl.fills = [paint('status/error')];
  const lic = logout.children.find(function (n) { return n.type === 'INSTANCE' && n.name === 'Icon'; });
  if (lic) recolor(lic, 'status/error');
  const chev = logout.findOne(function (n) { return n.name === 'Chevron'; });
  if (chev) chev.visible = false;

  const ver = await text('Version 1.0.0', 'Micro/12 Medium', 'text/secondary', 'Version');
  c.appendChild(ver); fillWidth(ver); ver.textAlignHorizontal = 'CENTER';

  addNav(f, 'More');
  addHomeIndicator(f);
  return 'flow';
}

const BUILDERS = {
  'Homepage': buildHomepage, 'Explore Destination': buildExplore,
  'Popular experiences 1': buildPopular1, 'Popular experiences 2': buildPopular2,
  'Trips Empty': buildTripsEmpty, 'Trips With Trips v2': buildTrips,
  'Saved Empty': buildSavedEmpty, 'More': buildMore,
};

// ----- swap built content into the original frame (keeps its ID + name) -----

function findStatusBar(frame) {
  return frame.findOne(function (n) { return n.type === 'INSTANCE' && /status bar/i.test(n.name); });
}
function swapIn(orig, tmp, mode, spacing) {
  const sb = findStatusBar(orig);
  // park the status bar on the page (out of any group) while the frame is cleared; re-inserted below
  if (sb) figma.currentPage.appendChild(sb);
  orig.children.slice().forEach(function (n) { n.remove(); });
  const statusBar = sb;

  shell(orig, spacing);
  const kids = tmp.children.slice().map(function (n) {
    return { n: n, abs: n.layoutPositioning === 'ABSOLUTE', x: n.x, y: n.y, c: n.constraints };
  });
  kids.forEach(function (k) {
    orig.appendChild(k.n);
    if (k.abs) {
      k.n.layoutPositioning = 'ABSOLUTE'; k.n.x = k.x; k.n.y = k.y; k.n.constraints = k.c;
      try { k.n.scrollBehavior = 'FIXED'; } catch (e) { /* older API */ }
    }
  });
  tmp.remove();

  if (!statusBar) { NOTES.push(orig.name + ': no status bar instance found.'); return; }
  if (mode === 'flow') {
    orig.insertChild(0, statusBar);
    statusBar.layoutSizingHorizontal = 'FILL';
  } else {
    // over the photo: absolute at the top, below the home indicator in z-order
    const ind = orig.children.find(function (n) { return n.name === 'Home indicator'; });
    orig.insertChild(ind ? orig.children.indexOf(ind) : orig.children.length, statusBar);
    statusBar.layoutPositioning = 'ABSOLUTE';
    statusBar.x = 0; statusBar.y = 0; statusBar.resize(SW, statusBar.height);
    statusBar.constraints = { horizontal: 'STRETCH', vertical: 'MIN' };
    try { statusBar.scrollBehavior = 'FIXED'; } catch (e) { /* older API */ }
  }
}
function restoreFrom(orig, archived) {
  orig.children.slice().forEach(function (n) { n.remove(); });
  orig.layoutMode = 'NONE';
  orig.fills = archived.fills;
  archived.children.forEach(function (n) { const c = n.clone(); orig.appendChild(c); c.x = n.x; c.y = n.y; });
}

// ----- Loading Screen: keep layout, bind colors to the nearest Wayfare variable -----

async function bindNearestColors(frame) {
  const col = await figma.variables.getVariableCollectionByIdAsync(V['text/primary'].variableCollectionId);
  const mode = col.defaultModeId;
  const palette = [];
  Object.keys(V).forEach(function (name) {
    const v = V[name];
    if (v.resolvedType !== 'COLOR' || v.variableCollectionId !== col.id) return;
    const val = v.valuesByMode[mode];
    if (!val || val.type === 'VARIABLE_ALIAS' || (val.a !== undefined && val.a < 1)) return;
    palette.push({ name: name, c: val });
  });
  let bound = 0; const unmatched = {};
  function match(color) {
    let best = null, bestD = 1;
    palette.forEach(function (p) {
      const d = Math.max(Math.abs(p.c.r - color.r), Math.abs(p.c.g - color.g), Math.abs(p.c.b - color.b));
      if (d < bestD) { bestD = d; best = p; }
    });
    return bestD <= 0.04 ? best : null;
  }
  function rebind(paints, label) {
    if (!Array.isArray(paints)) return null;
    let changed = false;
    const out = paints.map(function (p) {
      if (p.type !== 'SOLID' || (p.boundVariables && p.boundVariables.color)) return p;
      const m = match(p.color);
      if (!m) { const hex = '#' + [p.color.r, p.color.g, p.color.b].map(function (x) { return ('0' + Math.round(x * 255).toString(16)).slice(-2); }).join('').toUpperCase(); unmatched[hex + ' (' + label + ')'] = 1; return p; }
      changed = true; bound++;
      const b = figma.variables.setBoundVariableForPaint(Object.assign({}, p), 'color', V[m.name]);
      return Object.assign({}, b, { opacity: p.opacity === undefined ? 1 : p.opacity });
    });
    return changed ? out : null;
  }
  const nodes = [frame].concat(ownLayers(frame, function () { return true; }));
  nodes.forEach(function (n) {
    if (n.type === 'INSTANCE' && n !== frame) return;
    if ('fills' in n) { const f = rebind(n.fills, n.name); if (f) n.fills = f; }
    if ('strokes' in n) { const s = rebind(n.strokes, n.name); if (s) n.strokes = s; }
  });
  const left = Object.keys(unmatched);
  NOTES.push('Loading Screen: ' + bound + ' colors bound to variables' + (left.length ? '; no matching variable for ' + left.join(', ') : '') + '. Layout left as is.');
}

async function runA4() {
  const page = await findWayfarePage();
  await figma.setCurrentPageAsync(page);
  if (page.children.some(function (n) { return n.name === 'Wayfare / _archive'; })) {
    throw new Error('A4 already ran (a "Wayfare / _archive" section exists). Undo it or delete the archive to run again.');
  }
  await loadTokens();
  await loadComponents(page);

  const frames = {};
  for (const name of Object.keys(SCREENS)) {
    const n = await figma.getNodeByIdAsync(SCREENS[name]);
    if (!n || n.type !== 'FRAME') throw new Error('Screen "' + name + '" (' + SCREENS[name] + ') not found.');
    frames[name] = n;
  }
  await harvestImages();

  // 1. build every screen off-canvas first — if anything fails, nothing on the page has changed
  const built = {};
  let farX = -6000;
  try {
    for (const name of Object.keys(BUILDERS)) {
      const tmp = figma.createFrame();
      tmp.name = 'tmp / ' + name; page.appendChild(tmp);
      tmp.x = farX; tmp.y = -3000; farX += 500;
      built[name] = { tmp: tmp, mode: await BUILDERS[name](tmp) };
      built[name].spacing = tmp.itemSpacing;
    }
  } catch (e) {
    Object.keys(built).forEach(function (k) { built[k].tmp.remove(); });
    page.children.filter(function (n) { return n.name.indexOf('tmp / ') === 0; }).forEach(function (n) { n.remove(); });
    throw e;
  }

  // 2. archive copies of the originals
  let maxY = -Infinity, minX = Infinity;
  page.children.forEach(function (n) {
    if (n.name.indexOf('tmp / ') === 0) return;
    maxY = Math.max(maxY, n.y + n.height);
  });
  Object.keys(frames).forEach(function (k) { minX = Math.min(minX, frames[k].x); });
  const archive = figma.createSection();
  archive.name = 'Wayfare / _archive';
  page.appendChild(archive);
  archive.x = minX; archive.y = maxY + 400;
  const copies = {};
  Object.keys(frames).forEach(function (name, i) {
    const c = frames[name].clone();
    archive.appendChild(c);
    c.name = '_archive / ' + frames[name].name;
    c.x = 40 + i * (SW + 60); c.y = 80;
    copies[name] = c;
  });
  archive.resizeWithoutConstraints(40 + Object.keys(frames).length * (SW + 60), SH + 160);

  // 3. swap new content into the original frames
  const done = [];
  for (const name of Object.keys(built)) {
    try {
      swapIn(frames[name], built[name].tmp, built[name].mode, built[name].spacing);
      done.push(name);
    } catch (e) {
      restoreFrom(frames[name], copies[name]);
      if (!built[name].tmp.removed) built[name].tmp.remove();
      NOTES.push(name + ' FAILED and was restored: ' + (e && e.message ? e.message : e));
    }
  }
  await bindNearestColors(frames['Loading Screen']);

  NOTES.forEach(function (n) { console.log('[A4] ' + n); });
  const sel = Object.keys(frames).map(function (k) { return frames[k]; });
  figma.currentPage.selection = sel;
  figma.viewport.scrollAndZoomIntoView(sel);
  const failed = NOTES.filter(function (n) { return n.indexOf('FAILED') >= 0; }).length;
  return (failed ? '⚠ ' : '✓ ') + 'A4: rebuilt ' + done.length + '/8 screens, Loading Screen colors bound, originals in "Wayfare / _archive". ' +
    (NOTES.length ? NOTES.length + ' note(s) in the console.' : '');
}

// ---------- A5: new screens ----------

const A5_ICONS = {
  'Wifi Off': '<path d="M2 8.5a15 15 0 0 1 5-2.9M10.5 4.6A15 15 0 0 1 22 8.5M5 12a10 10 0 0 1 3.5-2M15.5 10.3A10 10 0 0 1 19 12M8.5 15.5a5 5 0 0 1 6-.6M12 19h.01M3 3l18 18"/>',
  'Sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  'Lock': '<rect x="4.5" y="10" width="15" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14.5v2.5"/>',
  'Camera': '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8L9 3.5h6L16.7 6h1.8A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><circle cx="12" cy="13" r="3.5"/>',
};
const A5_SECTION = 'Wayfare / A5 screens';
let A5_STATUS_BAR = null; // status bar instance to clone (taken from the Homepage)
const createdIcons = [];

function addA5Icons(page) {
  const comps = page.children.find(function (n) { return n.type === 'SECTION' && n.name === 'Components'; });
  const grid = comps.findOne(function (n) { return n.name === 'Icon grid'; });
  if (!grid) throw new Error('Could not find the "Icon grid" frame in the Components section.');
  for (const name of Object.keys(A5_ICONS)) {
    if (ICON[name]) continue;
    makeIcon(grid, name, A5_ICONS[name], null);
    createdIcons.push(ICON[name]);
  }
}

// images now live in the rebuilt screens / components
async function harvestA5Images() {
  async function byPath(rootId, path) {
    let n = await figma.getNodeByIdAsync(rootId);
    for (const name of path) {
      if (!n) return null;
      n = n.findOne(function (x) { return x.name === name; });
    }
    return n;
  }
  function take(key, node) {
    if (node && 'fills' in node && Array.isArray(node.fills)) {
      const p = node.fills.find(function (x) { return x.type === 'IMAGE'; });
      if (p) { IMG[key] = Object.assign({}, p, { scaleMode: 'FILL' }); return; }
    }
    NOTES.push('Image "' + key + '" not found — grey placeholder used.');
  }
  const H = SCREENS['Homepage'], P1 = SCREENS['Popular experiences 1'], T = SCREENS['Trips With Trips v2'];
  take('avatar', await byPath(H, ['Avatar']));
  take('kyoto', await byPath(H, ['DestinationHeroCard / Tokyo']));
  take('alt1', await byPath(H, ['DestinationHeroCard / Kyoto']));
  take('culture', await byPath(H, ['ExperienceCard / Culture & Cuisine', 'Image']));
  take('fuji', await byPath(H, ['ExperienceCard / Tokyo Essentials', 'Image']));
  take('kyotoTall', await byPath(SCREENS['Explore Destination'], ['Hero']));
  take('day1', await byPath(P1, ['DayCard / Day 1', 'Image']));
  take('dayA', await byPath(P1, ['DayCard / Day 2', 'Image']));
  take('dayB', await byPath(P1, ['DayCard / Day 3', 'Image']));
  take('alt2', await byPath(P1, ['DayCard / Day 4', 'Image']));
  take('trip', await byPath(T, ['Trip card / Tokyo Essentials', 'Image']));
  take('qr', await byPath(T, ['QR code']));
  take('logo', await figma.getNodeByIdAsync('2675:64'));
}

// ----- A5 building blocks -----

const A5_FRAMES = [];
function newScreen(name) {
  const f = figma.createFrame();
  A5_FRAMES.push(f);
  f.name = 'Wayfare / ' + name;
  shell(f);
  return f;
}
// status bar + home indicator; mode 'flow' (in the column) or 'overlay' (over a photo / dark bg)
function finish(f, mode, darkIndicator) {
  const ind = figma.createRectangle();
  ind.name = 'Home indicator'; ind.resize(134, 5); radius(ind, 'pill'); fill(ind, darkIndicator ? 'text/inverse' : 'text/primary');
  absolute(f, ind, (SW - 134) / 2, SH - 13, { horizontal: 'CENTER', vertical: 'MAX' });
  if (!mode || !A5_STATUS_BAR) return;
  const sb = A5_STATUS_BAR.clone();
  if (mode === 'flow') {
    f.insertChild(0, sb);
    sb.layoutPositioning = 'AUTO';
    sb.layoutSizingHorizontal = 'FILL';
  } else {
    f.insertChild(f.children.indexOf(ind), sb);
    sb.layoutPositioning = 'ABSOLUTE';
    sb.x = 0; sb.y = 0; sb.resize(SW, sb.height);
    sb.constraints = { horizontal: 'STRETCH', vertical: 'MIN' };
    try { sb.scrollBehavior = 'FIXED'; } catch (e) { /* older API */ }
  }
}
function bottomRadius(n, key) {
  const v = V['radius/' + key];
  n.topLeftRadius = 0; n.topRightRadius = 0;
  n.setBoundVariable('bottomLeftRadius', v); n.setBoundVariable('bottomRightRadius', v);
}
function btn(style, label, iconName) {
  const b = setProps(variant('Button', 'Style=' + style), { Label: label, 'Show icon': !!iconName });
  if (iconName && iconName !== 'Arrow Right') setProps(b, { Icon: ICON[iconName].id });
  b.name = label;
  return b;
}
function iconBtn(style, kind, name) {
  const b = variant('IconButton', 'Style=' + style + ', Icon=' + kind); b.name = name || kind; return b;
}
function spacer(parent, name) {
  const s = auto(name || 'Spacer', 'VERTICAL');
  parent.appendChild(s); s.layoutSizingVertical = 'FILL'; s.layoutSizingHorizontal = 'FILL';
  return s;
}
function card(parent, name, spacing) {
  const c = auto(name, 'VERTICAL'); gap(c, spacing === undefined ? 12 : spacing); pad(c, 16, 16, 16, 16);
  radius(c, 'card'); fill(c, 'surface/background'); stroke(c, 'border/subtle', 1);
  append(parent, c, true);
  return c;
}
function row(parent, name, spacing, fillW) {
  const r = auto(name, 'HORIZONTAL'); r.counterAxisAlignItems = 'CENTER';
  if (spacing) gap(r, spacing);
  append(parent, r, fillW !== false);
  return r;
}
function iconCircle(iconName, size, iconSize, bg, fg) {
  const c = auto('Icon circle', 'HORIZONTAL'); center(c); fixed(c, size, size); radius(c, 'pill'); fill(c, bg);
  c.appendChild(icon(iconName, fg, iconSize));
  return c;
}
async function link(label, color) {
  const l = auto('Link / ' + label, 'HORIZONTAL'); l.counterAxisAlignItems = 'CENTER';
  l.resize(60, 44); l.counterAxisSizingMode = 'FIXED'; l.primaryAxisSizingMode = 'AUTO';
  l.appendChild(await text(label, 'Body/14 Medium', color || 'accent/strong', 'Label'));
  return l;
}
// back button + centered title + optional right link
async function navHeader(parent, title, rightLabel) {
  const r = row(parent, 'Header', 12);
  r.appendChild(iconBtn('Light', 'Back', 'Back'));
  const t = await text(title, 'Heading/18 Semibold', 'text/primary', 'Title');
  t.textAlignHorizontal = 'CENTER';
  r.appendChild(t); fillWidth(t, 1);
  if (rightLabel) r.appendChild(await link(rightLabel));
  else { const s = auto('Balance', 'HORIZONTAL'); fixed(s, 44, 44); r.appendChild(s); }
  return r;
}
async function kv(parent, label, value, strong) {
  const r = row(parent, 'Row / ' + label);
  r.primaryAxisAlignItems = 'SPACE_BETWEEN';
  r.appendChild(await text(label, strong ? 'Subheading/16 Semibold' : 'Body/14 Medium', strong ? 'text/primary' : 'text/secondary', 'Label'));
  r.appendChild(await text(value, strong ? 'Subheading/16 Semibold' : 'Body/15 Regular', 'text/primary', 'Value'));
  return r;
}
async function iconLine(parent, iconName, value) {
  const r = row(parent, 'Info / ' + iconName, 12);
  r.appendChild(icon(iconName, 'text/secondary', 20));
  const t = await text(value, 'Body/15 Regular', 'text/primary', 'Value');
  r.appendChild(t); fillWidth(t, 1);
  return r;
}
function divider(parent) {
  const d = figma.createRectangle(); d.name = 'Divider'; d.resize(100, 1); fill(d, 'border/subtle');
  append(parent, d, true);
  return d;
}
async function input(parent, label, value, opts) {
  opts = opts || {};
  const g = auto('Field / ' + label, 'VERTICAL'); gap(g, 8);
  append(parent, g, true);
  g.appendChild(await text(label, 'Caption/13 Regular', 'text/secondary', 'Label'));
  const field = auto('Input', 'HORIZONTAL'); field.counterAxisAlignItems = 'CENTER'; gap(field, 12);
  pad(field, 0, 16, 0, 16); radius(field, 'card'); fill(field, 'surface/card');
  field.resize(353, 52); field.counterAxisSizingMode = 'FIXED';
  if (opts.focused) stroke(field, 'accent/strong', 1.5);
  append(g, field, true);
  const v = await text(value, 'Body/15 Regular', opts.placeholder || opts.readOnly ? 'text/secondary' : 'text/primary', opts.placeholder ? 'Placeholder' : 'Value');
  field.appendChild(v); fillWidth(v, 1);
  if (opts.readOnly) field.appendChild(icon('Lock', 'text/secondary', 20));
  if (opts.helper) g.appendChild(await text(opts.helper, 'Caption/13 Regular', 'text/secondary', 'Helper'));
  return g;
}
// pinned bottom area with one or more full-width buttons
function footer(f, buttons) {
  const ft = auto('Footer', 'VERTICAL'); gap(ft, 12); pad(ft, 12, 20, 32, 20);
  ft.resize(SW, 100); ft.primaryAxisSizingMode = 'AUTO'; ft.counterAxisSizingMode = 'FIXED';
  fill(ft, 'surface/background');
  ft.strokes = [paint('border/subtle')]; ft.strokeAlign = 'INSIDE';
  ft.strokeTopWeight = 1; ft.strokeBottomWeight = 0; ft.strokeLeftWeight = 0; ft.strokeRightWeight = 0;
  buttons.forEach(function (b) { append(ft, b, true); });
  absolute(f, ft, 0, SH - ft.height, { horizontal: 'STRETCH', vertical: 'MAX' });
  return ft;
}
function bookingBar(f, prefix, amount, label, width) {
  const b = SET.StickyBookingBar.createInstance(); b.name = 'StickyBookingBar';
  setProps(b, { Prefix: prefix, Amount: amount });
  const ex = (b.exposedInstances || []).find(function (n) { return n.name === 'Book button'; });
  if (ex) { setProps(ex, { Label: label }); if (width) ex.resize(width, 52); }
  absolute(f, b, 0, SH - b.height, { horizontal: 'STRETCH', vertical: 'MAX' });
  return b;
}
function block(parent, name, w, h, rKey) {
  const b = figma.createRectangle(); b.name = name; b.resize(w, h); fill(b, 'surface/card');
  radius(b, rKey || 'sm');
  parent.appendChild(b);
  return b;
}
// the Button nested in an instance (found by its props — mainComponent can't be read synchronously here)
function nestedButton(inst) {
  return inst.findOne(function (n) {
    return n.type === 'INSTANCE' && Object.keys(n.componentProperties).some(function (k) { return k.indexOf('Show icon') === 0; });
  });
}

// ----- A5 screens -----

const ONBOARDING = [
  ['kyotoTall', 'Discover places worth the trip', 'Hand-picked destinations and local experiences across Japan and beyond.'],
  ['dayA', 'Plan every day with ease', 'Clear day-by-day itineraries, so you always know what comes next.'],
  ['fuji', 'Book in minutes, travel light', 'Secure booking, instant confirmation and every ticket in one place.'],
];
async function buildOnboarding(i) {
  const d = ONBOARDING[i];
  const f = newScreen('Onboarding ' + (i + 1));
  const hero = auto('Hero', 'VERTICAL'); append(f, hero, true);
  hero.resize(SW, 480); hero.primaryAxisSizingMode = 'FIXED';
  hero.fills = img(d[0]); bottomRadius(hero, 'sheet');
  padX(hero); hero.paddingTop = 52; hero.counterAxisAlignItems = 'MAX';
  if (i < 2) {
    const skip = auto('Skip', 'HORIZONTAL'); center(skip); pad(skip, 0, 16, 0, 16);
    skip.resize(72, 44); skip.counterAxisSizingMode = 'FIXED'; skip.primaryAxisSizingMode = 'AUTO';
    radius(skip, 'pill'); fill(skip, 'surface/background');
    skip.appendChild(await text('Skip', 'Body/14 Medium', 'text/primary', 'Label'));
    hero.appendChild(skip);
  }
  const c = column(f, 'Content', 32, 40, 16); c.layoutSizingVertical = 'FILL';
  const dots = row(c, 'Page dots', 8, false);
  for (let k = 0; k < 3; k++) {
    const dot = figma.createRectangle(); dot.name = k === i ? 'Dot / active' : 'Dot';
    dot.resize(k === i ? 24 : 8, 8); radius(dot, 'pill'); fill(dot, k === i ? 'accent/strong' : 'border/subtle');
    dots.appendChild(dot);
  }
  const t = await text(d[1], 'Display/28 Bold', 'text/primary', 'Title'); c.appendChild(t); fillWidth(t);
  const b = await text(d[2], 'Body/15 Regular', 'text/secondary', 'Body'); c.appendChild(b); fillWidth(b);
  spacer(c);
  if (i < 2) append(c, btn('Primary', 'Next', 'Arrow Right'), true);
  else { append(c, btn('Primary', 'Get started', 'Arrow Right'), true); append(c, btn('Ghost', 'I already have an account'), true); }
  finish(f, 'overlay');
  return f;
}

async function buildSignIn() {
  const f = newScreen('Sign in');
  const c = column(f, 'Content', 32, 40, 24); c.layoutSizingVertical = 'FILL';
  const logo = auto('Logo', 'HORIZONTAL'); center(logo); fixed(logo, 64, 64); radius(logo, 'card'); fill(logo, 'surface/dark');
  const mark = figma.createRectangle(); mark.name = 'Logo mark'; mark.resize(44, 44);
  mark.fills = IMG.logo ? [Object.assign({}, IMG.logo, { scaleMode: 'FIT' })] : [paint('accent/primary')];
  logo.appendChild(mark); c.appendChild(logo);
  const head = auto('Heading', 'VERTICAL'); gap(head, 8); append(c, head, true);
  head.appendChild(await text('Welcome to Wayfare', 'Display/28 Bold', 'text/primary', 'Title'));
  const sub = await text('Sign in to plan, book and keep every trip in one place.', 'Body/15 Regular', 'text/secondary', 'Subtitle');
  head.appendChild(sub); fillWidth(sub);

  const google = row(c, 'Continue with Google', 12); google.primaryAxisAlignItems = 'CENTER';
  google.resize(353, 52); google.counterAxisSizingMode = 'FIXED'; google.layoutSizingHorizontal = 'FILL';
  radius(google, 'pill'); stroke(google, 'border/subtle', 1); fill(google, 'surface/background');
  const g = auto('Google mark', 'HORIZONTAL'); center(g); fixed(g, 24, 24);
  g.appendChild(await text('G', 'Subheading/16 Semibold', 'text/primary', 'Mark'));
  google.appendChild(g);
  google.appendChild(await text('Continue with Google', 'Body/14 Medium', 'text/primary', 'Label'));

  const or = row(c, 'Or', 12);
  divider(or); or.appendChild(await text('or', 'Caption/13 Regular', 'text/secondary', 'Label')); divider(or);

  await input(c, 'Email', 'you@example.com', { placeholder: true, focused: true });
  append(c, btn('Primary', 'Send code'), true);
  spacer(c);
  const terms = await text('By continuing you agree to Wayfare\'s Terms of Service and Privacy Policy.', 'Caption/13 Regular', 'text/secondary', 'Terms');
  c.appendChild(terms); fillWidth(terms); terms.textAlignHorizontal = 'CENTER';
  ['Terms of Service', 'Privacy Policy'].forEach(function (s) {
    const at = terms.characters.indexOf(s);
    if (at >= 0) terms.setRangeFills(at, at + s.length, [paint('accent/strong')]);
  });
  finish(f, 'flow');
  NOTES.push('Sign in: the "G" is a placeholder — swap in Google\'s official sign-in mark.');
  return f;
}

async function buildOtp() {
  const f = newScreen('OTP verify');
  const c = column(f, 'Content', 8, 40, 24); c.layoutSizingVertical = 'FILL';
  const top = row(c, 'Header'); top.appendChild(iconBtn('Light', 'Back', 'Back'));
  const head = auto('Heading', 'VERTICAL'); gap(head, 8); append(c, head, true);
  head.appendChild(await text('Enter the code', 'Display/28 Bold', 'text/primary', 'Title'));
  const sub = await text('We sent a 6-digit code to sreeraj@example.com', 'Body/15 Regular', 'text/secondary', 'Subtitle');
  head.appendChild(sub); fillWidth(sub);
  const boxes = row(c, 'Code', 8); boxes.primaryAxisAlignItems = 'SPACE_BETWEEN';
  const digits = ['4', '8', '2', '9', '', ''];
  for (let k = 0; k < 6; k++) {
    const b = auto('Digit ' + (k + 1), 'HORIZONTAL'); center(b); fixed(b, 48, 56);
    radius(b, 'sm'); fill(b, 'surface/card');
    if (k === 4) {
      stroke(b, 'accent/strong', 1.5);
      const caret = figma.createRectangle(); caret.name = 'Caret'; caret.resize(2, 24); fill(caret, 'accent/strong');
      b.appendChild(caret);
    } else if (digits[k]) b.appendChild(await text(digits[k], 'Title/22 Semibold', 'text/primary', 'Value'));
    boxes.appendChild(b);
  }
  const resend = await text('Resend code in 0:42', 'Body/14 Medium', 'text/secondary', 'Resend timer');
  c.appendChild(resend);
  resend.setRangeFills(15, 19, [paint('text/primary')]);
  spacer(c);
  append(c, btn('Primary', 'Verify'), true);
  finish(f, 'flow');
  return f;
}

const RESULTS = [
  TOKYO_ESSENTIALS, CULTURE_CUISINE,
  { title: 'Mt. Fuji & Hakone Day Trip', meta: '1 day · from $149/person', reviews: '312 reviews', rating: '4.9', img: 'kyotoTall' },
  { title: 'Old Tokyo Food Walk', meta: '1 day · from $79/person', reviews: '204 reviews', rating: '4.8', img: 'dayA' },
];
async function buildSearchResults() {
  const f = newScreen('Search results');
  const c = column(f, 'Content', 8, 120, 16);
  const top = row(c, 'Search row', 12);
  top.appendChild(iconBtn('Light', 'Back', 'Back'));
  const search = auto('Search bar', 'HORIZONTAL'); search.counterAxisAlignItems = 'CENTER';
  gap(search, 8); pad(search, 0, 16, 0, 16); radius(search, 'pill'); fill(search, 'surface/card');
  search.resize(200, 48); search.counterAxisSizingMode = 'FIXED';
  append(top, search, true);
  search.appendChild(icon('Search', 'text/secondary', 20));
  const q = await text('Tokyo', 'Body/14 Medium', 'text/primary', 'Query'); search.appendChild(q); fillWidth(q, 1);
  const clear = icon('Close', 'text/secondary', 20); clear.name = 'Clear'; search.appendChild(clear);
  const filt = auto('Filter button', 'HORIZONTAL'); center(filt); fixed(filt, 48, 48); radius(filt, 'pill'); fill(filt, 'surface/dark');
  filt.appendChild(icon('Filter', 'text/inverse', 20)); top.appendChild(filt);

  const chips = hScroll(c, 'Chips'); gap(chips, 8);
  [['All', true], ['Guided tours'], ['Food'], ['Culture'], ['Day trips']].forEach(function (d) { chips.appendChild(chip(d[0], !!d[1])); });
  const head = row(c, 'Results header'); head.primaryAxisAlignItems = 'SPACE_BETWEEN';
  head.appendChild(await text('12 results', 'Subheading/16 Semibold', 'text/primary', 'Count'));
  head.appendChild(await link('Sort: Popular'));
  const list = auto('Results', 'VERTICAL'); gap(list, 16); append(c, list, true);
  RESULTS.forEach(function (r) {
    const e = expCard(r); e.resize(353, e.height); e.primaryAxisSizingMode = 'AUTO';
    append(list, e, true);
  });
  addNav(f, 'Home');
  finish(f, 'flow');
  return f;
}

async function buildFilters(searchFrame) {
  const f = newScreen('Filters');
  f.layoutMode = 'NONE';
  const bg = searchFrame.clone(); bg.name = 'Background / Search results';
  f.appendChild(bg); bg.x = 0; bg.y = 0;
  const scrim = figma.createRectangle(); scrim.name = 'Scrim'; scrim.resize(SW, SH); fill(scrim, 'surface/dark');
  scrim.opacity = 0.5; // node opacity — keeps the fill bound to surface/dark
  f.appendChild(scrim);

  const s = auto('Bottom sheet', 'VERTICAL'); gap(s, 24); pad(s, 12, 20, 32, 20);
  s.resize(SW, 400); s.primaryAxisSizingMode = 'AUTO'; s.counterAxisSizingMode = 'FIXED';
  topRadius(s, 'sheet'); fill(s, 'surface/background');
  f.appendChild(s);
  grabber(s);
  const head = row(s, 'Header'); head.primaryAxisAlignItems = 'SPACE_BETWEEN';
  head.appendChild(await text('Filters', 'Heading/18 Semibold', 'text/primary', 'Title'));
  head.appendChild(await link('Reset'));

  const price = auto('Price range', 'VERTICAL'); gap(price, 16); append(s, price, true);
  const pr = row(price, 'Label'); pr.primaryAxisAlignItems = 'SPACE_BETWEEN';
  pr.appendChild(await text('Price range', 'Subheading/16 Semibold', 'text/primary', 'Title'));
  pr.appendChild(await text('$100 – $1,200', 'Body/14 Medium', 'text/secondary', 'Value'));
  const slider = figma.createFrame(); slider.name = 'Slider'; slider.resize(353, 44); slider.fills = []; slider.clipsContent = false;
  price.appendChild(slider);
  const track = figma.createRectangle(); track.name = 'Track'; track.resize(353, 4); radius(track, 'pill'); fill(track, 'border/subtle');
  slider.appendChild(track); track.x = 0; track.y = 20;
  const lo = 30, hi = 290;
  const range = figma.createRectangle(); range.name = 'Range'; range.resize(hi - lo, 4); radius(range, 'pill'); fill(range, 'accent/strong');
  slider.appendChild(range); range.x = lo; range.y = 20;
  [lo, hi].forEach(function (x, k) {
    const th = figma.createEllipse(); th.name = k ? 'Thumb / max' : 'Thumb / min'; th.resize(28, 28);
    fill(th, 'surface/background'); stroke(th, 'accent/strong', 2); th.strokeAlign = 'INSIDE'; th.effects = [SHADOW_SOFT];
    slider.appendChild(th); th.x = x - 14; th.y = 8;
  });

  const groups = [['Duration', [['1–2 days'], ['3–4 days', true], ['5+ days']]], ['Rating', [['Any'], ['4.0+'], ['4.5+', true]]]];
  for (const grp of groups) {
    const gr = auto(grp[0], 'VERTICAL'); gap(gr, 12); append(s, gr, true);
    gr.appendChild(await text(grp[0], 'Subheading/16 Semibold', 'text/primary', 'Title'));
    const chips = row(gr, 'Chips', 8, false);
    grp[1].forEach(function (d) { chips.appendChild(chip(d[0], !!d[1])); });
  }
  append(s, btn('Primary', 'Apply · 8 results'), true);
  s.x = 0; s.y = SH - s.height;
  s.constraints = { horizontal: 'STRETCH', vertical: 'MAX' };

  const ind = figma.createRectangle(); ind.name = 'Home indicator'; ind.resize(134, 5); radius(ind, 'pill'); fill(ind, 'text/primary');
  f.appendChild(ind); ind.x = (SW - 134) / 2; ind.y = SH - 13;
  NOTES.push('Filters: slider thumbs are 28px (44px tall touch row); the sheet is a free-positioned overlay on a copy of Search results.');
  return f;
}

function calendarCell(day, kind) {
  const cell = auto(day ? 'Day ' + day : 'Empty', 'HORIZONTAL'); center(cell); fixed(cell, 44, 44);
  if (kind === 'band') fill(cell, 'accent/soft');
  if (!day) return Promise.resolve(cell);
  if (kind === 'edge') {
    const dot = auto('Selected', 'HORIZONTAL'); center(dot); fixed(dot, 40, 40); radius(dot, 'pill'); fill(dot, 'accent/strong');
    cell.appendChild(dot);
    return text(String(day), 'Body/14 Medium', 'text/inverse', 'Label').then(function (t) { dot.appendChild(t); return cell; });
  }
  return text(String(day), 'Body/14 Medium', 'text/primary', 'Label').then(function (t) { cell.appendChild(t); return cell; });
}
async function stepper(parent, label, sub, value, minDisabled) {
  const r = row(parent, 'Stepper / ' + label); r.primaryAxisAlignItems = 'SPACE_BETWEEN';
  const left = auto('Text', 'VERTICAL'); gap(left, 4); r.appendChild(left);
  left.appendChild(await text(label, 'Body/15 Regular', 'text/primary', 'Label'));
  left.appendChild(await text(sub, 'Caption/13 Regular', 'text/secondary', 'Detail'));
  const st = auto('Stepper', 'HORIZONTAL'); st.counterAxisAlignItems = 'CENTER'; gap(st, 12); r.appendChild(st);
  [['Minus', minDisabled], ['Plus', false]].forEach(function (b, k) {
    const bt = auto(b[0], 'HORIZONTAL'); center(bt); fixed(bt, 44, 44); radius(bt, 'pill'); stroke(bt, 'border/subtle', 1);
    bt.appendChild(icon(b[0], b[1] ? 'border/subtle' : 'text/primary', 20));
    if (k === 1) st.appendChild(bt); else st.insertChild(0, bt);
  });
  const v = await text(String(value), 'Subheading/16 Semibold', 'text/primary', 'Value');
  st.insertChild(1, v);
}
async function buildBookingDates() {
  const f = newScreen('Booking dates');
  const c = column(f, 'Content', 8, 140, 20);
  await navHeader(c, 'Select dates');
  const cap = await text('Tokyo Essentials · 4 days, 3 nights', 'Caption/13 Regular', 'text/secondary', 'Experience'); c.appendChild(cap);

  const cal = card(c, 'Calendar', 8);
  const mh = row(cal, 'Month'); mh.primaryAxisAlignItems = 'SPACE_BETWEEN';
  const prev = auto('Previous', 'HORIZONTAL'); center(prev); fixed(prev, 44, 44); prev.appendChild(icon('Arrow Left', 'text/primary', 20));
  const next = auto('Next', 'HORIZONTAL'); center(next); fixed(next, 44, 44); next.appendChild(icon('Arrow Right', 'text/primary', 20));
  mh.appendChild(prev);
  mh.appendChild(await text('August 2026', 'Subheading/16 Semibold', 'text/primary', 'Month'));
  mh.appendChild(next);
  const wk = row(cal, 'Weekdays'); wk.primaryAxisAlignItems = 'SPACE_BETWEEN';
  for (const d of ['S', 'M', 'T', 'W', 'T', 'F', 'S']) {
    const w = auto(d, 'HORIZONTAL'); center(w); fixed(w, 44, 24);
    w.appendChild(await text(d, 'Micro/12 Medium', 'text/secondary', 'Label')); wk.appendChild(w);
  }
  // August 2026 starts on a Saturday
  const days = [null, null, null, null, null, null];
  for (let d = 1; d <= 31; d++) days.push(d);
  while (days.length % 7) days.push(null);
  for (let w = 0; w < days.length / 7; w++) {
    const r = row(cal, 'Week ' + (w + 1)); r.primaryAxisAlignItems = 'SPACE_BETWEEN';
    for (let k = 0; k < 7; k++) {
      const d = days[w * 7 + k];
      const kind = d === 12 || d === 15 ? 'edge' : (d === 13 || d === 14 ? 'band' : null);
      r.appendChild(await calendarCell(d, kind));
    }
  }
  const sel = await text('Aug 12 – Aug 15 · 4 days', 'Body/14 Medium', 'accent/strong', 'Selection'); cal.appendChild(sel);

  const trav = card(c, 'Travelers', 16);
  trav.appendChild(await text('Travelers', 'Subheading/16 Semibold', 'text/primary', 'Title'));
  await stepper(trav, 'Adults', 'Age 13+', 2, false);
  divider(trav);
  await stepper(trav, 'Children', 'Age 2–12', 0, true);

  bookingBar(f, 'Total · 2 travelers', '$1,998', 'Continue', 160);
  finish(f, 'flow');
  return f;
}

async function summaryCard(parent) {
  const s = card(parent, 'Experience summary');
  const r = row(s, 'Summary', 12);
  const pic = figma.createRectangle(); pic.name = 'Image'; pic.resize(88, 88); radius(pic, 'sm'); pic.fills = img('fuji');
  r.appendChild(pic);
  const info = auto('Info', 'VERTICAL'); gap(info, 4); append(r, info, true);
  const t = await text('Tokyo Essentials', 'Subheading/16 Semibold', 'text/primary', 'Title'); info.appendChild(t); fillWidth(t, 1);
  info.appendChild(await text('4 days · 3 nights · Guided tour', 'Caption/13 Regular', 'text/secondary', 'Meta'));
  const b = setProps(SET.RatingBadge.createInstance(), { Rating: '4.8' }); b.name = 'RatingBadge'; info.appendChild(b);
}
async function buildBookingReview() {
  const f = newScreen('Booking review');
  const c = column(f, 'Content', 8, 140, 16);
  await navHeader(c, 'Review booking');
  await summaryCard(c);
  const d = card(c, 'Trip details');
  d.appendChild(await text('Trip details', 'Subheading/16 Semibold', 'text/primary', 'Title'));
  await kv(d, 'Dates', 'Aug 12 – Aug 15, 2026');
  await kv(d, 'Travelers', '2 adults');
  await kv(d, 'Meeting point', 'Hotel lobby, Shinjuku');
  const p = card(c, 'Price details');
  p.appendChild(await text('Price details', 'Subheading/16 Semibold', 'text/primary', 'Title'));
  await kv(p, 'Base price · 2 × $925', '$1,850');
  await kv(p, 'Taxes & fees', '$148');
  divider(p);
  await kv(p, 'Total', '$1,998', true);
  const note = row(c, 'Cancellation', 8);
  note.appendChild(icon('Tick Circle', 'accent/strong', 20));
  const nt = await text('Free cancellation until Aug 5, 2026', 'Caption/13 Regular', 'text/secondary', 'Label'); note.appendChild(nt); fillWidth(nt, 1);
  bookingBar(f, 'Total', '$1,998', 'Continue to payment', 200);
  finish(f, 'flow');
  return f;
}

async function payOption(parent, iconName, title, detail, state) {
  const o = auto('Option / ' + title, 'HORIZONTAL'); o.counterAxisAlignItems = 'CENTER'; gap(o, 12); pad(o, 16, 16, 16, 16);
  radius(o, 'card');
  if (state === 'selected') { fill(o, 'accent/soft'); stroke(o, 'accent/strong', 1.5); }
  else { fill(o, 'surface/background'); stroke(o, 'border/subtle', 1); }
  append(parent, o, true);
  o.appendChild(iconCircle(iconName, 44, 20, state === 'selected' ? 'surface/background' : 'surface/card', 'text/primary'));
  const t = auto('Text', 'VERTICAL'); gap(t, 4); append(o, t, true);
  t.appendChild(await text(title, 'Subheading/16 Semibold', 'text/primary', 'Title'));
  t.appendChild(await text(detail, 'Caption/13 Regular', 'text/secondary', 'Detail'));
  if (state === 'add') { o.appendChild(icon('Chevron Right', 'text/secondary', 20)); return; }
  const radio = auto('Radio', 'HORIZONTAL'); center(radio); fixed(radio, 22, 22); radius(radio, 'pill');
  stroke(radio, state === 'selected' ? 'accent/strong' : 'border/subtle', 2);
  if (state === 'selected') {
    const dot = figma.createEllipse(); dot.name = 'Dot'; dot.resize(12, 12); fill(dot, 'accent/strong'); radio.appendChild(dot);
  }
  o.appendChild(radio);
}
async function buildPayment() {
  const f = newScreen('Payment');
  const c = column(f, 'Content', 8, 140, 16);
  await navHeader(c, 'Payment');
  c.appendChild(await text('Pay with', 'Heading/18 Semibold', 'text/primary', 'Title'));
  await payOption(c, 'Card', 'Visa •••• 4242', 'Expires 08/28', 'selected');
  await payOption(c, 'Scan', 'UPI', 'Pay with any UPI app', null);
  await payOption(c, 'Plus', 'Add new card', 'Credit or debit card', 'add');
  const tot = card(c, 'Total');
  await kv(tot, 'Tokyo Essentials · 2 travelers', '$1,998');
  const sec = row(c, 'Secure note', 8);
  sec.appendChild(icon('Lock', 'text/secondary', 20));
  const st = await text('Payments are encrypted and processed securely.', 'Caption/13 Regular', 'text/secondary', 'Label'); sec.appendChild(st); fillWidth(st, 1);
  footer(f, [btn('Primary', 'Pay $1,998')]);
  finish(f, 'flow');
  return f;
}

async function buildConfirmation() {
  const f = newScreen('Booking confirmed');
  const c = column(f, 'Content', 8, 40, 24); c.layoutSizingVertical = 'FILL'; c.counterAxisAlignItems = 'CENTER';
  spacer(c);
  c.appendChild(iconCircle('Tick Circle', 160, 96, 'accent/soft', 'accent/strong'));
  const copy = auto('Copy', 'VERTICAL'); copy.counterAxisAlignItems = 'CENTER'; gap(copy, 8); append(c, copy, true);
  const t = await text('You\'re going to Tokyo!', 'Display/28 Bold', 'text/primary', 'Title'); copy.appendChild(t); t.textAlignHorizontal = 'CENTER';
  const m = await text('Your booking is confirmed. We\'ve emailed the details to sreeraj@example.com.', 'Body/15 Regular', 'text/secondary', 'Message');
  copy.appendChild(m); fillWidth(m); m.textAlignHorizontal = 'CENTER';
  const id = card(c, 'Booking ID', 8);
  await kv(id, 'Booking ID', 'WF-24816');
  await kv(id, 'Dates', 'Aug 12 – Aug 15');
  spacer(c);
  append(c, btn('Primary', 'View trip', 'Arrow Right'), true);
  append(c, btn('Ghost', 'Back to home'), true);
  finish(f, 'flow');
  return f;
}

async function buildTripDetails() {
  const f = newScreen('Trip details');
  f.itemSpacing = -24;
  const hero = auto('Hero', 'VERTICAL'); append(f, hero, true);
  hero.resize(SW, 280); hero.primaryAxisSizingMode = 'FIXED'; hero.fills = img('fuji');
  padX(hero); hero.paddingTop = 52;
  const bar = row(hero, 'Top bar'); bar.primaryAxisAlignItems = 'SPACE_BETWEEN';
  bar.appendChild(iconBtn('Light', 'Back', 'Back')); bar.appendChild(iconBtn('Light', 'HeartFilled', 'Like'));
  const s = sheet(f, 'Sheet', SH - 256, 40);
  grabber(s);
  const tr = row(s, 'Title row', 8); tr.primaryAxisAlignItems = 'SPACE_BETWEEN';
  tr.appendChild(await text('Tokyo Essentials', 'Title/22 Semibold', 'text/primary', 'Title'));
  const sb = variant('StatusBadge', 'Status=Confirmed'); sb.name = 'StatusBadge'; tr.appendChild(sb);
  const info = auto('Info', 'VERTICAL'); gap(info, 12); append(s, info, true);
  await iconLine(info, 'Calendar', 'Aug 12 – Aug 15, 2026 · 4 days');
  await iconLine(info, 'People', '2 adults');
  await iconLine(info, 'Location', 'Meeting point: Hotel lobby, Shinjuku');
  await sectionHeader(s, 'Itinerary', 'View all');
  const list = auto('Itinerary summary', 'VERTICAL'); append(s, list, true);
  const DAYS = ['Arrival & City Intro', 'Historic Tokyo', 'Modern City Life', 'Departure'];
  for (let k = 0; k < DAYS.length; k++) {
    const r = row(list, 'Day ' + (k + 1), 12); pad(r, 12, 0, 12, 0);
    const pill = auto('Day', 'HORIZONTAL'); pad(pill, 4, 8, 4, 8); radius(pill, 'pill'); fill(pill, 'accent/soft');
    pill.appendChild(await text('Day ' + (k + 1), 'Micro/12 Medium', 'accent/strong', 'Label'));
    r.appendChild(pill);
    const t = await text(DAYS[k], 'Body/15 Regular', 'text/primary', 'Title'); r.appendChild(t); fillWidth(t, 1);
    if (k < DAYS.length - 1) divider(list);
  }
  append(s, btn('Dark', 'Show QR ticket', 'Scan'), true);
  const cancel = btn('Ghost', 'Cancel booking'); append(s, cancel, true);
  const cl = cancel.findOne(function (n) { return n.type === 'TEXT'; }); if (cl) cl.fills = [paint('status/error')];
  finish(f, 'overlay');
  return f;
}

async function buildTicket() {
  const f = newScreen('Ticket');
  fill(f, 'surface/dark');
  const c = column(f, 'Content', 8, 40, 24); c.layoutSizingVertical = 'FILL'; c.counterAxisAlignItems = 'CENTER';
  const top = row(c, 'Header', 12);
  const close = auto('Close', 'HORIZONTAL'); center(close); fixed(close, 44, 44); radius(close, 'pill'); fill(close, 'surface/background');
  close.appendChild(icon('Close', 'text/primary', 20)); top.appendChild(close);
  const tt = await text('Your ticket', 'Heading/18 Semibold', 'text/inverse', 'Title'); top.appendChild(tt); fillWidth(tt, 1); tt.textAlignHorizontal = 'CENTER';
  const bal = auto('Balance', 'HORIZONTAL'); fixed(bal, 44, 44); top.appendChild(bal);

  const t = auto('Ticket card', 'VERTICAL'); t.counterAxisAlignItems = 'CENTER'; gap(t, 20); pad(t, 24, 24, 24, 24);
  radius(t, 'sheet'); fill(t, 'surface/background'); append(c, t, true);
  const head = auto('Heading', 'VERTICAL'); head.counterAxisAlignItems = 'CENTER'; gap(head, 4); t.appendChild(head);
  head.appendChild(await text('Tokyo Essentials', 'Title/22 Semibold', 'text/primary', 'Title'));
  head.appendChild(await text('Aug 12 – Aug 15, 2026 · 4 days', 'Caption/13 Regular', 'text/secondary', 'Dates'));
  const qr = figma.createRectangle(); qr.name = 'QR code'; qr.resize(240, 240);
  qr.fills = IMG.qr ? [Object.assign({}, IMG.qr, { scaleMode: 'FIT' })] : [paint('surface/card')];
  t.appendChild(qr);
  const dash = figma.createLine(); dash.name = 'Perforation'; dash.resize(305, 0);
  dash.strokes = [paint('border/subtle')]; dash.strokeWeight = 1; dash.dashPattern = [6, 6];
  append(t, dash, true);
  const det = auto('Details', 'VERTICAL'); gap(det, 12); append(t, det, true);
  await kv(det, 'Traveler', 'Sreeraj H');
  await kv(det, 'Booking ID', 'WF-24816');
  await kv(det, 'Group', '2 adults');
  const note = row(c, 'Brightness note', 8); note.primaryAxisAlignItems = 'CENTER';
  note.appendChild(icon('Sun', 'text/inverse', 20));
  note.appendChild(await text('Brightness turned up so the code scans easily', 'Caption/13 Regular', 'text/inverse', 'Label'));
  finish(f, 'flow', true);
  NOTES.push('Ticket: the status bar instance has dark ink on a dark screen — switch it to its light variant if the kit has one.');
  return f;
}

const SAVED = [
  ['Tokyo', 'Japan · 4.9', 'kyoto'], ['Kyoto', 'Japan · 4.8', 'alt1'],
  ['Tokyo Essentials', '4 days · $999/person', 'fuji'], ['Culture & Cuisine', '3 days · $890/person', 'culture'],
  ['Historic Tokyo', 'Day tour · $79/person', 'dayA'], ['Modern City Life', 'Day tour · $69/person', 'dayB'],
];
async function buildSaved() {
  const f = newScreen('Saved');
  const c = column(f, 'Content', 8, 120, 20);
  const head = auto('Heading', 'VERTICAL'); gap(head, 4); append(c, head, true);
  head.appendChild(await text('Saved places', 'Display/28 Bold', 'text/primary', 'Title'));
  head.appendChild(await text('6 saved', 'Body/14 Medium', 'text/secondary', 'Count'));
  const chips = row(c, 'Chips', 8, false);
  [['All', true], ['Destinations'], ['Experiences']].forEach(function (d) { chips.appendChild(chip(d[0], !!d[1])); });
  const grid = auto('Grid', 'HORIZONTAL'); grid.layoutWrap = 'WRAP'; gap(grid, 16); grid.counterAxisSpacing = 20;
  append(c, grid, true);
  grid.primaryAxisSizingMode = 'FIXED';
  for (const s of SAVED) {
    const it = auto('Saved / ' + s[0], 'VERTICAL'); gap(it, 8);
    it.resize(168, 240); it.primaryAxisSizingMode = 'AUTO'; it.counterAxisSizingMode = 'FIXED';
    grid.appendChild(it);
    const ph = auto('Image', 'HORIZONTAL'); ph.primaryAxisAlignItems = 'MAX'; pad(ph, 8, 8, 8, 8);
    ph.resize(168, 168); ph.primaryAxisSizingMode = 'FIXED'; ph.counterAxisSizingMode = 'FIXED';
    radius(ph, 'card'); ph.fills = img(s[2]); ph.clipsContent = true;
    ph.appendChild(iconBtn('Light', 'HeartFilled', 'Unsave'));
    it.appendChild(ph);
    const t = await text(s[0], 'Subheading/16 Semibold', 'text/primary', 'Title'); it.appendChild(t); fillWidth(t, 1);
    it.appendChild(await text(s[1], 'Caption/13 Regular', 'text/secondary', 'Meta'));
  }
  addNav(f, 'Saved');
  finish(f, 'flow');
  return f;
}

async function buildEditProfile() {
  const f = newScreen('Edit profile');
  const c = column(f, 'Content', 8, 140, 24);
  await navHeader(c, 'Edit profile');
  const av = auto('Avatar block', 'VERTICAL'); av.counterAxisAlignItems = 'CENTER'; gap(av, 8); append(c, av, true);
  const holder = figma.createFrame(); holder.name = 'Avatar'; holder.resize(96, 96); holder.fills = []; holder.clipsContent = false;
  av.appendChild(holder);
  const pic = figma.createEllipse(); pic.name = 'Photo'; pic.resize(96, 96); pic.fills = img('avatar'); holder.appendChild(pic);
  const badge = iconCircle('Camera', 36, 18, 'accent/strong', 'text/inverse'); badge.name = 'Edit photo';
  stroke(badge, 'surface/background', 2);
  holder.appendChild(badge); badge.x = 64; badge.y = 64;
  av.appendChild(await link('Change photo'));
  await input(c, 'Full name', 'Sreeraj H');
  await input(c, 'Email', 'sreeraj@example.com', { readOnly: true, helper: 'Email is used to sign in and can\'t be changed here.' });
  await input(c, 'Phone', '+91 98765 43210');
  footer(f, [btn('Primary', 'Save changes')]);
  finish(f, 'flow');
  return f;
}

const NOTIFS = [
  ['Today', [['Tick Circle', 'Booking confirmed', 'Tokyo Essentials · Aug 12 – Aug 15 is all set.', '2m', true],
    ['Calendar', 'Your trip starts in 3 days', 'Evenings in Tokyo are cool — pack a light jacket.', '1h', true]]],
  ['Earlier', [['Bell', 'Price drop on Culture & Cuisine', 'Now from $890/person for August dates.', 'Yesterday', false],
    ['Location', 'New in Kyoto', '3 new experiences near Gion this month.', 'Mon', false]]],
];
async function buildNotifications() {
  const f = newScreen('Notifications');
  const c = column(f, 'Content', 8, 40, 16);
  await navHeader(c, 'Notifications', 'Mark all read');
  for (const grp of NOTIFS) {
    c.appendChild(await text(grp[0], 'Micro/12 Medium', 'text/secondary', 'Section'));
    const list = auto(grp[0], 'VERTICAL'); append(c, list, true);
    for (const n of grp[1]) {
      const r = auto('Notification / ' + n[1], 'HORIZONTAL'); gap(r, 12); pad(r, 12, 0, 12, 0);
      append(list, r, true);
      r.appendChild(iconCircle(n[0], 44, 20, 'accent/soft', 'accent/strong'));
      const t = auto('Text', 'VERTICAL'); gap(t, 4); append(r, t, true);
      const tt = await text(n[1], 'Body/15 Regular', 'text/primary', 'Title'); t.appendChild(tt); fillWidth(tt, 1);
      const m = await text(n[2], 'Caption/13 Regular', 'text/secondary', 'Message'); t.appendChild(m); fillWidth(m, 2);
      t.appendChild(await text(n[3], 'Micro/12 Medium', 'text/secondary', 'Time'));
      if (n[4]) { const dot = figma.createEllipse(); dot.name = 'Unread'; dot.resize(8, 8); fill(dot, 'accent/primary'); r.appendChild(dot); }
    }
  }
  finish(f, 'flow');
  return f;
}

async function buildNotificationsEmpty() {
  const f = newScreen('Notifications Empty');
  const c = column(f, 'Content', 8, 40, 16); c.layoutSizingVertical = 'FILL';
  await navHeader(c, 'Notifications');
  const body = auto('Body', 'VERTICAL'); center(body); append(c, body, true); body.layoutSizingVertical = 'FILL';
  const es = emptyState({ title: 'You\'re all caught up', message: 'We\'ll let you know about bookings, trip reminders and price drops.', icon: 'Bell' });
  const b = nestedButton(es); if (b) setProps(b, { Label: 'Back to home', 'Show icon': false });
  body.appendChild(es);
  finish(f, 'flow');
  return f;
}

async function buildOffline() {
  const f = newScreen('Offline');
  const c = column(f, 'Content', 8, 120, 16); c.layoutSizingVertical = 'FILL';
  const banner = row(c, 'Offline banner', 8); pad(banner, 12, 16, 12, 16); radius(banner, 'card'); fill(banner, 'status/warning-soft');
  banner.appendChild(icon('Wifi Off', 'status/warning', 20));
  const bt = await text('No internet connection', 'Body/14 Medium', 'text/primary', 'Label'); banner.appendChild(bt); fillWidth(bt, 1);
  const body = auto('Body', 'VERTICAL'); center(body); append(c, body, true); body.layoutSizingVertical = 'FILL';
  const es = emptyState({ title: 'You\'re offline', message: 'Check your connection and try again. Saved trips and tickets still open offline.', icon: 'Wifi Off' });
  const b = nestedButton(es); if (b) setProps(b, { Label: 'Try again', 'Show icon': false });
  body.appendChild(es);
  addNav(f, 'Home');
  finish(f, 'flow');
  return f;
}

async function buildSkeleton() {
  const f = newScreen('Homepage Loading');
  const c = column(f, 'Content', 8, 120, 24);
  const head = row(c, 'Greeting'); head.primaryAxisAlignItems = 'SPACE_BETWEEN';
  const txt = auto('Text', 'VERTICAL'); gap(txt, 8); head.appendChild(txt);
  block(txt, 'Greeting', 200, 28); block(txt, 'Subtitle', 150, 16);
  const av = figma.createEllipse(); av.name = 'Avatar'; av.resize(44, 44); fill(av, 'surface/card'); head.appendChild(av);
  const s = block(c, 'Search bar', 353, 48, 'pill'); s.layoutSizingHorizontal = 'FILL';
  const pick = auto('Continents', 'VERTICAL'); gap(pick, 12); append(c, pick, true);
  block(pick, 'Title', 160, 20);
  const chips = row(pick, 'Chips', 8, false);
  [56, 72, 64, 112].forEach(function (w, k) { block(chips, 'Chip ' + (k + 1), w, 36, 'pill'); });
  const car = hScroll(c, 'Carousel');
  block(car, 'Card', 264, 368, 'sheet'); block(car, 'Card', 264, 368, 'sheet');
  const tr = row(c, 'Trending header'); tr.primaryAxisAlignItems = 'SPACE_BETWEEN';
  block(tr, 'Title', 180, 20); block(tr, 'Link', 56, 16);
  addNav(f, 'Home');
  finish(f, 'flow');
  NOTES.push('Homepage Loading: skeleton blocks use surface/card; animate them with a shimmer in code.');
  return f;
}

async function runA5() {
  const page = await findWayfarePage();
  await figma.setCurrentPageAsync(page);
  if (page.children.some(function (n) { return n.name === A5_SECTION; })) {
    throw new Error('A5 already ran ("' + A5_SECTION + '" exists). Delete that section to run it again.');
  }
  await loadTokens();
  await loadComponents(page);
  await harvestA5Images();
  const home = await figma.getNodeByIdAsync(SCREENS['Homepage']);
  A5_STATUS_BAR = home ? findStatusBar(home) : null;
  if (!A5_STATUS_BAR) NOTES.push('No status bar found on the Homepage — new screens have none.');

  let maxY = -Infinity, minX = Infinity;
  page.children.forEach(function (n) { maxY = Math.max(maxY, n.y + n.height); });
  for (const k of Object.keys(SCREENS)) { const fr = await figma.getNodeByIdAsync(SCREENS[k]); if (fr) minX = Math.min(minX, fr.x); }
  if (minX === Infinity) minX = 0;

  const section = figma.createSection();
  section.name = A5_SECTION;
  page.appendChild(section);
  section.x = minX; section.y = maxY + 400;
  try {
    addA5Icons(page);
    const frames = [];
    for (let i = 0; i < 3; i++) frames.push(await buildOnboarding(i));
    frames.push(await buildSignIn());
    frames.push(await buildOtp());
    const search = await buildSearchResults(); frames.push(search);
    frames.push(await buildFilters(search));
    frames.push(await buildBookingDates());
    frames.push(await buildBookingReview());
    frames.push(await buildPayment());
    frames.push(await buildConfirmation());
    frames.push(await buildTripDetails());
    frames.push(await buildTicket());
    frames.push(await buildSaved());
    frames.push(await buildEditProfile());
    frames.push(await buildNotifications());
    frames.push(await buildNotificationsEmpty());
    frames.push(await buildOffline());
    frames.push(await buildSkeleton());

    const PER_ROW = 10, GAP = 60, PAD = 80;
    frames.forEach(function (fr, i) {
      section.appendChild(fr);
      fr.x = PAD + (i % PER_ROW) * (SW + GAP);
      fr.y = PAD + Math.floor(i / PER_ROW) * (SH + 120);
    });
    const rows = Math.ceil(frames.length / PER_ROW);
    section.resizeWithoutConstraints(PAD * 2 + PER_ROW * (SW + GAP) - GAP, PAD * 2 + rows * (SH + 120) - 120);
    NOTES.forEach(function (n) { console.log('[A5] ' + n); });
    figma.currentPage.selection = [section];
    figma.viewport.scrollAndZoomIntoView([section]);
    return '✓ A5: ' + frames.length + ' new screens in "' + A5_SECTION + '" + ' + createdIcons.length + ' new icons. ' +
      (NOTES.length ? NOTES.length + ' note(s) in the console.' : '');
  } catch (e) {
    section.remove();
    A5_FRAMES.forEach(function (n) { if (!n.removed) n.remove(); }); // half-built screens not yet moved into the section
    createdIcons.forEach(function (n) { if (!n.removed) n.remove(); });
    throw e;
  }
}

// ---------- A6: prototype + QA ----------

const A5_NAMES = ['Onboarding 1', 'Onboarding 2', 'Onboarding 3', 'Sign in', 'OTP verify', 'Search results', 'Filters',
  'Booking dates', 'Booking review', 'Payment', 'Booking confirmed', 'Trip details', 'Ticket', 'Saved', 'Edit profile',
  'Notifications', 'Notifications Empty', 'Offline', 'Homepage Loading'];

async function collectScreens(page) {
  const S = {};
  for (const k of Object.keys(SCREENS)) {
    const n = await figma.getNodeByIdAsync(SCREENS[k]);
    if (n) S[k] = n;
  }
  const sec = page.children.find(function (n) { return n.name === A5_SECTION; });
  if (!sec) throw new Error('No "' + A5_SECTION + '" section — run A5 first.');
  A5_NAMES.forEach(function (name) {
    const f = sec.children.find(function (n) { return n.name === 'Wayfare / ' + name; });
    if (f) S[name] = f;
  });
  const missing = Object.keys(SCREENS).concat(A5_NAMES).filter(function (k) { return !S[k]; });
  if (missing.length) throw new Error('Screens not found: ' + missing.join(', '));
  return S;
}
// skip copies used only as backdrops (Filters shows a copy of Search results)
function inBackdrop(n, root) {
  for (let p = n.parent; p && p !== root; p = p.parent) if (p.name.indexOf('Background / ') === 0) return true;
  return false;
}
function by(frame, name) {
  return frame.findOne(function (n) { return n.name === name && !inBackdrop(n, frame); });
}

const TRANS = { type: 'SMART_ANIMATE', easing: { type: 'EASE_OUT' }, duration: 0.3 };
const WIRE = { ok: 0, missing: [] };
async function react(node, label, trigger, action) {
  if (!node) { WIRE.missing.push(label + ' (layer not found)'); return; }
  try {
    await node.setReactionsAsync([{ trigger: trigger, actions: [action] }]);
    WIRE.ok++;
  } catch (e) { WIRE.missing.push(label + ': ' + (e && e.message ? e.message : e)); }
}
function go(node, dest, label) {
  return react(node, label, { type: 'ON_CLICK' },
    { type: 'NODE', destinationId: dest.id, navigation: 'NAVIGATE', transition: TRANS, resetVideoPosition: false });
}
function back(node, label) { return react(node, label, { type: 'ON_CLICK' }, { type: 'BACK' }); }
function after(frame, dest, seconds, label) {
  return react(frame, label, { type: 'AFTER_TIMEOUT', timeout: seconds },
    { type: 'NODE', destinationId: dest.id, navigation: 'NAVIGATE', transition: { type: 'DISSOLVE', easing: { type: 'EASE_OUT' }, duration: 0.4 }, resetVideoPosition: false });
}

async function runPrototype(S) {
  const W = function (screen, layer, dest) { return go(by(S[screen], layer), S[dest], screen + ' › ' + layer + ' → ' + dest); };
  const B = function (screen, layer) { return back(by(S[screen], layer || 'Back'), screen + ' › ' + (layer || 'Back') + ' → back'); };

  await after(S['Loading Screen'], S['Onboarding 1'], 2, 'Loading Screen → Onboarding 1 (after 2s)');
  await W('Onboarding 1', 'Next', 'Onboarding 2'); await W('Onboarding 1', 'Skip', 'Sign in');
  await W('Onboarding 2', 'Next', 'Onboarding 3'); await W('Onboarding 2', 'Skip', 'Sign in');
  await W('Onboarding 3', 'Get started', 'Sign in'); await W('Onboarding 3', 'I already have an account', 'Sign in');
  await W('Sign in', 'Send code', 'OTP verify'); await W('Sign in', 'Continue with Google', 'Homepage');
  await W('OTP verify', 'Verify', 'Homepage'); await B('OTP verify');

  await W('Homepage', 'DestinationHeroCard / Tokyo', 'Explore Destination');
  await W('Homepage', 'ExperienceCard / Tokyo Essentials', 'Popular experiences 1');
  await W('Homepage', 'Search bar', 'Search results');
  await W('Homepage', 'Filter button', 'Filters');
  await W('Homepage', 'Avatar', 'More');
  await after(S['Homepage Loading'], S['Homepage'], 1.5, 'Homepage Loading → Homepage (after 1.5s)');

  await B('Explore Destination');
  await W('Explore Destination', 'ExperienceCard / Tokyo Essentials', 'Popular experiences 1');

  for (const p of ['Popular experiences 1', 'Popular experiences 2']) {
    await B(p);
    await W(p, 'StickyBookingBar', 'Booking dates');
    const tabs = by(S[p], 'Tabs');
    if (tabs && tabs.children.length > 1) {
      // only the inactive tab links (a frame can't navigate to itself)
      if (p === 'Popular experiences 2') await go(tabs.children[0], S['Popular experiences 1'], p + ' › Itinerary tab');
      else await go(tabs.children[1], S['Popular experiences 2'], p + ' › What\'s included tab');
    } else WIRE.missing.push(p + ' › Tabs (layer not found)');
  }

  await B('Search results');
  await W('Search results', 'Filter button', 'Filters');
  await W('Search results', 'ExperienceCard / Tokyo Essentials', 'Popular experiences 1');
  await W('Filters', 'Apply · 8 results', 'Search results');
  await back(by(S['Filters'], 'Scrim'), 'Filters › Scrim → back');

  await B('Booking dates'); await W('Booking dates', 'StickyBookingBar', 'Booking review');
  await B('Booking review'); await W('Booking review', 'StickyBookingBar', 'Payment');
  await B('Payment'); await W('Payment', 'Pay $1,998', 'Booking confirmed');
  await W('Booking confirmed', 'View trip', 'Trip details'); await W('Booking confirmed', 'Back to home', 'Homepage');

  await W('Trips With Trips v2', 'View details', 'Trip details');
  await W('Trips With Trips v2', 'Ticket', 'Ticket');
  await B('Trip details'); await W('Trip details', 'Show QR ticket', 'Ticket');
  await back(by(S['Ticket'], 'Close'), 'Ticket › Close → back');

  for (const k of [['Trips Empty', 'Homepage'], ['Saved Empty', 'Homepage'], ['Notifications Empty', 'Homepage'], ['Offline', 'Homepage']]) {
    const es = by(S[k[0]], 'EmptyState');
    await go(es ? nestedButton(es) : null, S[k[1]], k[0] + ' › EmptyState button → ' + k[1]);
  }
  await B('Notifications Empty'); await B('Notifications');

  await W('Saved', 'Saved / Tokyo', 'Explore Destination');
  await W('Saved', 'Saved / Tokyo Essentials', 'Popular experiences 1');

  await W('More', 'ListRow / Profile', 'Edit profile');
  await W('More', 'Edit profile', 'Edit profile');
  await W('More', 'ListRow / Notifications', 'Notifications');
  await W('More', 'ListRow / Log out', 'Sign in');
  await B('Edit profile'); await W('Edit profile', 'Save changes', 'More');

  // NavBar tabs on every screen that has one
  const TABS = { Home: 'Homepage', Trips: 'Trips With Trips v2', Saved: 'Saved', More: 'More' };
  for (const k of Object.keys(S)) {
    const nav = by(S[k], 'NavBar');
    if (!nav) continue;
    for (const t of Object.keys(TABS)) {
      if (TABS[t] === k) continue; // no self-link
      await go(nav.findOne(function (n) { return n.name === 'Tab / ' + t; }), S[TABS[t]], k + ' › NavBar ' + t);
    }
  }
  try {
    const page = S['Homepage'].parent.type === 'PAGE' ? S['Homepage'].parent : figma.currentPage;
    const others = (page.flowStartingPoints || []).filter(function (f) { return f.nodeId !== S['Loading Screen'].id; });
    page.flowStartingPoints = [{ nodeId: S['Loading Screen'].id, name: 'Wayfare app' }].concat(others);
  } catch (e) { WIRE.missing.push('Flow starting point: ' + e.message); }
}

// ----- QA -----

function lum(c) {
  const f = function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function blend(top, alpha, under) {
  return { r: top.r * alpha + under.r * (1 - alpha), g: top.g * alpha + under.g * (1 - alpha), b: top.b * alpha + under.b * (1 - alpha) };
}
// effective background behind a node; null when it sits on a photo / gradient
function backgroundOf(node, root) {
  for (let p = node.parent; p; p = p.parent) {
    if (p.type === 'PAGE' || p.type === 'SECTION') return { r: 1, g: 1, b: 1 };
    if (!('fills' in p) || !Array.isArray(p.fills)) continue;
    const vis = p.fills.filter(function (f) { return f.visible !== false; });
    if (!vis.length) { if (p === root) return { r: 1, g: 1, b: 1 }; continue; }
    // any image / gradient in the stack (even under a translucent tint) means "on a photo"
    if (vis.some(function (f) { return f.type !== 'SOLID'; })) return null;
    const topPaint = vis[vis.length - 1];
    const a = (topPaint.opacity === undefined ? 1 : topPaint.opacity) * (p.opacity === undefined ? 1 : p.opacity);
    if (a >= 0.99) return topPaint.color;
    const under = backgroundOf(p, root);
    return under ? blend(topPaint.color, a, under) : null;
  }
  return { r: 1, g: 1, b: 1 };
}
function hex(c) { return '#' + [c.r, c.g, c.b].map(function (x) { return ('0' + Math.round(x * 255).toString(16)).slice(-2); }).join('').toUpperCase(); }
function where(n, root) {
  const path = [];
  for (let p = n; p && p !== root; p = p.parent) path.unshift(p.name);
  return root.name.replace('Wayfare / ', '') + ' › ' + path.slice(-3).join(' › ');
}

async function runQA(S) {
  const R = { small: [], smallFixed: [], contrast: [], touch: [], hardcoded: [], translucent: [], detached: [], noAuto: [], data: [], names: [], rebound: 0 };
  const compNames = Object.keys(SET);
  const INTENTIONAL_NONE = ['Slider', 'Avatar', 'Background / Search results'];
  const loaded = {};
  async function loadFonts(t) {
    const segs = t.getStyledTextSegments(['fontName']);
    for (const s of segs) { const k = s.fontName.family + '|' + s.fontName.style; if (!loaded[k]) { await figma.loadFontAsync(s.fontName); loaded[k] = 1; } }
  }

  for (const key of Object.keys(S)) {
    const root = S[key];
    if (/ (Copy|Section)$|  /.test(root.name)) R.names.push('"' + root.name + '" (kept — renaming would break references; rename by hand if wanted)');
    const all = root.findAll(function (n) { return !inBackdrop(n, root); });

    // own layers: not inside instances (those inherit from components)
    const own = all.filter(function (n) {
      for (let p = n.parent; p && p !== root; p = p.parent) if (p.type === 'INSTANCE') return false;
      return true;
    });

    for (const n of all) {
      // 1. text size + 2. contrast (includes text inside instances)
      if (n.type === 'TEXT' && n.visible) {
        const segs = n.getStyledTextSegments(['fontSize', 'fills', 'fontWeight']);
        const isOwn = own.indexOf(n) >= 0;
        for (const s of segs) {
          if (s.fontSize < 12) {
            if (isOwn) { await loadFonts(n); n.setRangeFontSize(s.start, s.end, 12); R.smallFixed.push(where(n, root) + ' (' + s.fontSize + 'px → 12px)'); }
            else R.small.push(where(n, root) + ' ' + s.fontSize + 'px');
          }
          const fp = (s.fills || []).filter(function (f) { return f.visible !== false && f.type === 'SOLID'; }).pop();
          if (!fp) continue;
          // status bars float over photos on some screens; their ink comes from the device kit
          if (/status bar/i.test(where(n, root))) continue;
          const bg = backgroundOf(n, root);
          if (!bg) continue; // on a photo — checked visually
          const a = (fp.opacity === undefined ? 1 : fp.opacity) * n.opacity;
          const fg = a < 1 ? blend(fp.color, a, bg) : fp.color;
          const ratio = contrast(fg, bg);
          const large = s.fontSize >= 24 || (s.fontSize >= 18.5 && s.fontWeight >= 600);
          if (ratio < (large ? 3 : 4.5)) R.contrast.push(where(n, root) + ' "' + n.characters.slice(s.start, Math.min(s.end, s.start + 30)) + '" ' + hex(fg) + ' on ' + hex(bg) + ' = ' + ratio.toFixed(2) + ':1');
        }
        // 6. data consistency
        const t = n.characters;
        if (/3[- ]days?\b.*Tokyo|Tokyo.*\b3[- ]days?\b|3-Days/i.test(t)) R.data.push(where(n, root) + ': "' + t + '" (Tokyo Essentials is 4 days)');
        if (/✅|[\uD83C-\uD83E][\uDC00-\uDFFF]/.test(t)) R.data.push(where(n, root) + ': emoji in "' + t + '"');
        if (/\S {2,}\S/.test(t)) R.data.push(where(n, root) + ': run of spaces in "' + t + '"');
        if (/Aug 12\s*[–-]\s*Aug 15/.test(t) && /\b3 days\b/.test(t)) R.data.push(where(n, root) + ': Aug 12–15 is 4 days');
        if (/\$999(?!\s*\/\s*person|\/person)/.test(t) && !/\$999 ×|\$1,998/.test(t)) R.data.push(where(n, root) + ': "$999" without "/person"');
      }
      // 3. touch targets: everything wired in the prototype
      if ('reactions' in n && n.reactions && n.reactions.length && n !== root && (n.width < 44 || n.height < 44)) {
        R.touch.push(where(n, root) + ' ' + Math.round(n.width) + '×' + Math.round(n.height));
      }
    }

    for (const n of own) {
      // 4a. hard-coded colors (bind exact matches, report the rest)
      for (const prop of ['fills', 'strokes']) {
        if (!(prop in n) || !Array.isArray(n[prop])) continue;
        let changed = false;
        const out = n[prop].map(function (p) {
          if (p.type !== 'SOLID' || (p.boundVariables && p.boundVariables.color)) return p;
          if (p.opacity !== undefined && p.opacity < 1) { R.translucent.push(where(n, root) + ' ' + hex(p.color) + ' @' + Math.round(p.opacity * 100) + '%'); return p; }
          const m = nearestVar(p.color);
          if (m) { changed = true; R.rebound++; return figma.variables.setBoundVariableForPaint(Object.assign({}, p), 'color', V[m]); }
          R.hardcoded.push(where(n, root) + ' ' + prop + ' ' + hex(p.color));
          return p;
        });
        if (changed) n[prop] = out;
      }
      // 4b. detached instances: frames named like components / variants
      if (n.type === 'FRAME' && (compNames.indexOf(n.name) >= 0 || /^(Style|State|Active|Status|Icon)=/.test(n.name))) R.detached.push(where(n, root));
      // 5. frames without auto layout
      if (key !== 'Loading Screen') { // kept as is on purpose
        if (n.type === 'FRAME' && n.layoutMode === 'NONE' && n.children.length && INTENTIONAL_NONE.indexOf(n.name) < 0) R.noAuto.push(where(n, root));
        if (n.type === 'GROUP') R.noAuto.push(where(n, root) + ' (group)');
      }
    }
    if (root.layoutMode === 'NONE' && ['Loading Screen', 'Filters'].indexOf(key) < 0) R.noAuto.push(root.name + ' (screen frame)');
  }
  return R;
}
let PALETTE = null;
async function loadPalette() {
  const col = await figma.variables.getVariableCollectionByIdAsync(V['text/primary'].variableCollectionId);
  PALETTE = [];
  Object.keys(V).forEach(function (name) {
    const v = V[name];
    if (v.resolvedType !== 'COLOR' || v.variableCollectionId !== col.id) return;
    const val = v.valuesByMode[col.defaultModeId];
    if (!val || val.type === 'VARIABLE_ALIAS' || (val.a !== undefined && val.a < 1)) return;
    PALETTE.push({ name: name, c: val });
  });
}
function nearestVar(color) {
  let best = null, bestD = 1;
  PALETTE.forEach(function (p) {
    const d = Math.max(Math.abs(p.c.r - color.r), Math.abs(p.c.g - color.g), Math.abs(p.c.b - color.b));
    if (d < bestD) { bestD = d; best = p.name; }
  });
  return bestD <= 0.02 ? best : null;
}

function reportText(R) {
  const L = [];
  function sec(title, items, okMsg, max) {
    L.push(''); L.push(title + ' (' + items.length + ')');
    if (!items.length) { L.push('  ✓ ' + okMsg); return; }
    items.slice(0, max || 25).forEach(function (i) { L.push('  • ' + i); });
    if (items.length > (max || 25)) L.push('  … and ' + (items.length - (max || 25)) + ' more (see console)');
  }
  L.push('WAYFARE — QA REPORT');
  L.push('Prototype: ' + WIRE.ok + ' interactions wired. Flow starts at "Wayfare / Loading Screen".');
  sec('Prototype links that could not be wired', WIRE.missing, 'all wired');
  sec('FIXED — text raised to 12px', R.smallFixed, 'nothing to fix');
  sec('Text under 12px inside components', R.small, 'none');
  sec('Contrast under 4.5:1 (3:1 for large text)', R.contrast, 'all text on solid backgrounds passes');
  sec('Touch targets under 44px (wired layers)', R.touch, 'all ≥ 44px');
  L.push(''); L.push('FIXED — hard-coded colors bound to variables: ' + R.rebound);
  sec('Hard-coded colors with no matching variable', R.hardcoded, 'none');
  sec('Translucent fills left unbound on purpose (Figma drops opacity on bound fills)', R.translucent, 'none');
  sec('Detached instances', R.detached, 'none');
  sec('Frames / groups without auto layout', R.noAuto, 'none (Loading Screen, Filters overlay, Slider and Avatar holder are free-positioned on purpose)');
  sec('Inconsistent data', R.data, 'Tokyo Essentials = 4 days / $999 per person everywhere; no emoji; no space runs');
  sec('Frame names', R.names, 'clean');
  L.push(''); L.push('Not checked automatically: text on photos (hero cards, onboarding, Explore/Trip headers) — verify by eye.');
  L.push('Out of scope, left untouched: "Wayfare / Trips / With Trips" (v1) and the second "Wayfare / Loading Screen".');
  return L.join('\n');
}

async function runA6() {
  const page = await findWayfarePage();
  await figma.setCurrentPageAsync(page);
  await loadTokens();
  await loadComponents(page);
  await loadPalette();
  const S = await collectScreens(page);

  await runPrototype(S);
  const R = await runQA(S);
  const report = reportText(R);
  console.log(report);
  [['contrast', R.contrast], ['touch', R.touch], ['hardcoded', R.hardcoded], ['noAuto', R.noAuto], ['wire', WIRE.missing]].forEach(function (x) {
    if (x[1].length > 25) console.log('[A6 ' + x[0] + ' full list]\n' + x[1].join('\n'));
  });

  // report frame on the canvas (replaces an earlier one)
  const old = page.children.find(function (n) { return n.name === 'Wayfare / QA report'; });
  if (old) old.remove();
  const sec = page.children.find(function (n) { return n.name === A5_SECTION; });
  const box = auto('Wayfare / QA report', 'VERTICAL');
  pad(box, 32, 32, 32, 32); radius(box, 'card'); fill(box, 'surface/background'); stroke(box, 'border/subtle', 1);
  page.appendChild(box);
  box.x = sec ? sec.x : 0; box.y = sec ? sec.y + sec.height + 200 : 0;
  const t = figma.createText();
  t.fontName = { family: FONT, style: 'Regular' }; t.fontSize = 16; t.lineHeight = { unit: 'PIXELS', value: 24 };
  t.characters = report; fill(t, 'text/primary');
  box.appendChild(t); t.textAutoResize = 'HEIGHT'; t.resize(960, t.height);
  figma.currentPage.selection = [box];
  figma.viewport.scrollAndZoomIntoView([box]);

  const issues = WIRE.missing.length + R.small.length + R.contrast.length + R.touch.length + R.hardcoded.length + R.detached.length + R.noAuto.length + R.data.length;
  return (issues ? '⚠ ' : '✓ ') + 'A6: ' + WIRE.ok + ' prototype links, ' + (R.smallFixed.length + R.rebound) + ' auto-fixes, ' + issues + ' open item(s). Report frame selected.';
}

// ---------- commands ----------

async function findWayfarePage() {
  const home = await figma.getNodeByIdAsync(HOMEPAGE_ID);
  let p = home;
  while (p && p.type !== 'PAGE') p = p.parent;
  if (!p) throw new Error('Could not find "Wayfare / Homepage" (' + HOMEPAGE_ID + '). Open the Web designs file first.');
  return p;
}

async function runA3() {
  const page = await findWayfarePage();
  await figma.setCurrentPageAsync(page);
  const existing = page.children.find(function (n) { return n.type === 'SECTION' && n.name === 'Components'; });
  if (existing) {
    throw new Error('A "Components" section already exists on this page. Delete it (or rename it) and run A3 again.');
  }
  await loadTokens();

  const section = figma.createSection();
  section.name = 'Components';
  page.appendChild(section);
  section.x = 2800; section.y = 0;
  try {
    board = auto('Components board', 'VERTICAL');
    board.itemSpacing = 56;
    board.paddingTop = 48; board.paddingBottom = 48; board.paddingLeft = 48; board.paddingRight = 48;
    board.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; board.cornerRadius = 24;
    section.appendChild(board);
    board.x = 0; board.y = 0;

    buildIcons();
    await buildChip();
    await buildButton();
    await buildIconButton();
    await buildRatingBadge();
    await buildStatusBadge();
    await buildListRow();
    await buildInclusionRow();
    await buildNavBar();
    await buildEmptyState();
    await buildDayCard();
    await buildExperienceCard();
    await buildHeroCard();
    await buildStickyBookingBar();

    section.resizeWithoutConstraints(board.width, board.height);
    figma.currentPage.selection = [section];
    figma.viewport.scrollAndZoomIntoView([section]);
    return '✓ A3 done: 13 components + ' + Object.keys(ICON).length + ' icons in the "Components" section.';
  } catch (e) {
    section.remove(); // only removes what this run created
    throw e;
  }
}

// ---------- Export inclusion photos ----------
// Exports the "What's included" image layers from "Wayfare / Popular experiences 2" at 2x,
// converts them to WebP (<=150 KB) in the plugin UI, and posts them to a local receiver
// (http://localhost:4199) that saves supabase/seed-images/inclusions/tokyo-essentials-<slug>.webp.
const INCLUSION_IMAGES = [
  { slug: 'accommodation', label: 'Accommodation', ids: ['2667:104'] },
  { slug: 'transport', label: 'Local transportation', ids: ['2667:99'] },
  { slug: 'tours', label: 'Guided city tours', ids: ['2667:126', '2667:94'] },
  { slug: 'breakfast', label: 'Daily breakfast', ids: ['2667:123'] },
];


const INCLUSION_UI = '<script>' +
  'const MAX = 150 * 1024;' +
  'async function toWebp(bytes) {' +
  '  const bmp = await createImageBitmap(new Blob([bytes], { type: "image/png" }));' +
  '  const scale = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));' +
  '  const c = document.createElement("canvas");' +
  '  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);' +
  '  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);' +
  '  let q = 0.86, blob;' +
  '  do { blob = await new Promise(function (r) { c.toBlob(r, "image/webp", q); }); q -= 0.08; } while (blob.size > MAX && q > 0.3);' +
  '  if (blob.type !== "image/webp") throw new Error("WebP encoding is not supported here");' +
  '  return { blob: blob, w: c.width, h: c.height };' +
  '}' +
  'onmessage = async function (ev) {' +
  '  const files = ev.data.pluginMessage.files; const results = [];' +
  '  try {' +
  '    for (const f of files) {' +
  '      const out = await toWebp(f.bytes);' +
  '      const res = await fetch("http://localhost:4199/inclusions/" + f.slug, { method: "POST", body: out.blob });' +
  '      if (!res.ok) throw new Error(f.slug + ": receiver said " + res.status);' +
  '      results.push(f.slug + " " + out.w + "x" + out.h + " " + Math.round(out.blob.size / 1024) + "KB");' +
  '    }' +
  '    parent.postMessage({ pluginMessage: { ok: true, results: results } }, "*");' +
  '  } catch (e) { parent.postMessage({ pluginMessage: { ok: false, error: String(e && e.message ? e.message : e) } }, "*"); }' +
  '};' +
  '</script>';

function hasImageFill(n) {
  return 'fills' in n && Array.isArray(n.fills) && n.fills.some(function (f) { return f.type === 'IMAGE' && f.visible !== false; });
}

function centerY(n) {
  const b = n.absoluteBoundingBox;
  return b ? b.y + b.height / 2 : 0;
}

function bbox(n) { return n.absoluteBoundingBox || { x: 0, y: 0, width: 0, height: 0 }; }

function dist(a, b) {
  const A = bbox(a), B = bbox(b);
  return Math.hypot(A.x + A.width / 2 - (B.x + B.width / 2), A.y + A.height / 2 - (B.y + B.height / 2));
}

// A photo layer: has an image fill, is thumbnail/card sized, and is not a container with text
// (that rules out hero/header images that carry the title, back button, etc.).
function isPhotoCandidate(n) {
  if (!hasImageFill(n)) return false;
  const b = bbox(n);
  if (b.width < 24 || b.height < 24 || b.width > 600 || b.height > 600) return false;
  return !('findOne' in n && n.findOne(function (c) { return c.type === 'TEXT'; }));
}

// Look in every page for a text node with this label and take the closest photo in its row/card
// (searching outward through ancestors, but never past the top-level screen frame).
async function imageNearLabel(label) {
  await figma.loadAllPagesAsync();
  const want = label.toLowerCase();
  const texts = figma.root.findAll(function (n) { return n.type === 'TEXT' && n.characters.trim().toLowerCase() === want; });
  let best = null, bestD = Infinity;
  for (const t of texts) {
    let scope = t.parent;
    while (scope && scope.type !== 'PAGE' && scope.type !== 'DOCUMENT') {
      const imgs = 'findAll' in scope ? scope.findAll(isPhotoCandidate) : [];
      if (imgs.length) {
        for (const img of imgs) {
          const d = dist(img, t);
          if (d < bestD && d < 400) { best = img; bestD = d; }
        }
        break;
      }
      if (scope.parent && scope.parent.type === 'PAGE') break;
      scope = scope.parent;
    }
  }
  return { node: best, labels: texts.length };
}

async function exportPng(node) {
  return node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 2 } });
}

async function runExportInclusions() {
  const files = [];
  const notes = [];
  const used = [];
  const seen = {};
  for (const item of INCLUSION_IMAGES) {
    let bytes = null;
    for (const id of item.ids) {
      const node = await figma.getNodeByIdAsync(id);
      if (node && hasImageFill(node) && 'exportAsync' in node) {
        try { bytes = await exportPng(node); break; } catch (e) { notes.push(item.slug + ': ' + id + ' export failed'); }
      } else {
        notes.push(item.slug + ': ' + id + (node ? ' is ' + node.type + ' without an image' : ' not found'));
      }
    }
    if (!bytes) {
      const found = await imageNearLabel(item.label);
      if (!found.node) {
        throw new Error('No photo next to "' + item.label + '" (' + found.labels + ' label(s) found in "' + figma.root.name + '"; ' + notes.join('; ') + ')');
      }
      if (seen[found.node.id]) {
        throw new Error('"' + item.label + '" and "' + seen[found.node.id] + '" matched the same layer (' + found.node.name + ') — not saving duplicates');
      }
      seen[found.node.id] = item.label;
      bytes = await exportPng(found.node);
      used.push(item.slug + '←' + found.node.name);
    }
    files.push({ slug: item.slug, bytes: bytes });
  }
  return new Promise(function (resolve, reject) {
    figma.showUI(INCLUSION_UI, { visible: false });
    figma.ui.onmessage = function (msg) {
      if (msg.ok) resolve('✓ Saved ' + msg.results.length + ' inclusion photos: ' + msg.results.join(', ') + (used.length ? ' (matched by label: ' + used.join(', ') + ')' : ''));
      else reject(new Error(msg.error + ' (is the local receiver running?)'));
    };
    figma.ui.postMessage({ files: files });
  });
}

async function main() {
  try {
    let msg;
    if (figma.command === 'a3') msg = await runA3();
    else if (figma.command === 'a4') msg = await runA4();
    else if (figma.command === 'a5') msg = await runA5();
    else if (figma.command === 'a6') msg = await runA6();
    else if (figma.command === 'inclusions') msg = await runExportInclusions();
    else throw new Error('Unknown command: ' + figma.command);
    figma.closePlugin(msg);
  } catch (e) {
    console.error(e);
    figma.closePlugin('⚠ Wayfare Builder: ' + (e && e.message ? e.message : String(e)));
  }
}

main();
