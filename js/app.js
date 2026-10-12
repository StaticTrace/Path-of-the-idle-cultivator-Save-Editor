import { decode, encode } from './codec.js';

const $ = s => document.querySelector(s);
/** Tiny DOM builder: el('div', {class:'x', onclick:fn}, child, 'text') */
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  e.append(...kids);
  return e;
};

let S = null;   // { data, format, name, original }
let edits = 0;

// ---------- helpers ----------
const getAt = (o, path) => path.reduce((a, k) => a?.[k], o);
const NUM = /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/** Parse user text into the same JS type as the old value (the game stores big numbers as strings). */
function coerce(old, text) {
  text = text.trim();
  if (typeof old === 'number') { const n = Number(text); return text !== '' && Number.isFinite(n) ? { value: n } : null; }
  if (typeof old === 'string' && NUM.test(old)) return NUM.test(text) ? { value: text } : null;
  return { value: text };
}
function commit(path, value) {
  const parent = getAt(S.data, path.slice(0, -1));
  if (parent[path.at(-1)] === value) return;
  parent[path.at(-1)] = value;
  edits++; updateMeta();
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove('show'), 2600);
}
function updateMeta() {
  const labels = { json: 'plain JSON', base64: 'Base64', 'xor-base64': 'XOR + Base64' };
  $('#meta').textContent = `${S.name} · ${labels[S.format]} · ${edits} change${edits === 1 ? '' : 's'}`;
}

/** Editable row for any leaf value. Invalid input is flagged and never written. */
function leafRow(label, path) {
  const val = getAt(S.data, path);
  const id = 'f' + Math.random().toString(36).slice(2);
  let input;
  if (typeof val === 'boolean') {
    input = el('input', { type: 'checkbox', class: 'sw', id, checked: val, onchange: e => commit(path, e.target.checked) });
  } else if (val === null) {
    input = el('input', { type: 'text', id, value: 'null', disabled: true });
  } else {
    input = el('input', { type: 'text', id, value: String(val), spellcheck: 'false',
      oninput: e => {
        const r = coerce(val, e.target.value);
        e.target.classList.toggle('bad', !r);
        if (r) commit(path, r.value);
      } });
  }
  return el('div', { class: 'row' }, el('label', { for: id, title: path.join('.') }, label), input);
}

const searchBox = (ph, onInput) => el('input', { type: 'search', placeholder: ph, 'aria-label': ph, oninput: e => onInput(e.target.value.toLowerCase()) });

// ---------- tabs ----------
const ESSENTIALS = {
  Resources: [['qi', 'Qi'], ['celestialQi', 'Celestial Qi'], ['spiritStones', 'Spirit stones'], ['deityEnergy', 'Deity energy'], ['renown.amount', 'Renown']],
  Lifespan: [['currentAge', 'Current age'], ['maxAge', 'Max age'], ['totalYearsLived', 'Total years lived'], ['highestLifeYears', 'Highest life years']],
  Cultivation: [['cultivations.qi.realm', 'Qi realm'], ['cultivations.qi.stage', 'Qi stage'], ['cultivations.effectiveRealm', 'Effective realm'],
    ['cultivations.peakEffectiveRealm', 'Peak effective realm'], ['rebirth.count', 'Rebirths'], ['rebirth.soulPower', 'Soul power'],
    ['rebirth.totalSoulPower', 'Total soul power'], ['ascension.count', 'Ascensions']],
  Combat: [['realmStats.hp', 'HP'], ['realmStats.maxBaseHp', 'Max base HP'], ['realmStats.defense', 'Defense'], ['realmStats.damage', 'Damage'],
    ['critChance', 'Crit chance'], ['critDamage', 'Crit damage'], ['combat.highestTierUnlocked', 'Highest monster tier unlocked'], ['combat.totalMonstersKilled', 'Monsters killed']],
};
function essentials() {
  const f = document.createDocumentFragment();
  for (const [group, fields] of Object.entries(ESSENTIALS)) {
    const grid = el('div', { class: 'grid' });
    for (const [p, label] of fields) {
      const path = ['state', ...p.split('.')];
      if (getAt(S.data, path) !== undefined) grid.append(leafRow(label, path));
    }
    f.append(el('h2', {}, group), grid);
  }
  return f;
}

function unlocks() {
  const path = ['state', 'unlockedMechanics'], map = getAt(S.data, path);
  const f = document.createDocumentFragment();
  if (!map) return el('p', { class: 'hint' }, 'No unlockedMechanics found in this save.');
  const grid = el('div', { class: 'grid' });
  const rows = Object.keys(map).map(k => [k, leafRow(k, [...path, k])]);
  grid.append(...rows.map(r => r[1]));
  const setAll = v => rows.forEach(([k, row]) => { row.querySelector('input').checked = v; commit([...path, k], v); });
  f.append(
    el('div', { class: 'tools' }, searchBox('Filter unlocks…', q => rows.forEach(([k, r]) => r.hidden = !k.toLowerCase().includes(q))),
      el('button', { onclick: () => setAll(true) }, 'Unlock all'), el('button', { onclick: () => setAll(false) }, 'Lock all')),
    el('p', { class: 'hint' }, 'Unlocking mechanics you have not reached may cause odd behaviour in game.'), grid);
  return f;
}

function inventory() {
  const inv = getAt(S.data, ['state', 'inventory']);
  if (!Array.isArray(inv?.items)) return el('p', { class: 'hint' }, 'No inventory.items array found.');
  const list = el('div');
  const rows = [];
  const addRow = item => {
    // Rows edit the item object directly, so deleting other rows never shifts the target.
    const input = el('input', { type: 'text', value: String(item.quantity), 'aria-label': item.id + ' quantity',
      oninput: e => { const r = coerce(item.quantity, e.target.value); e.target.classList.toggle('bad', !r); if (r) { item.quantity = r.value; edits++; updateMeta(); } } });
    const row = el('div', { class: 'row' }, el('label', {}, item.id), input,
      el('button', { class: 'ghost', title: 'Remove item', onclick: () => { inv.items.splice(inv.items.indexOf(item), 1); row.remove(); edits++; updateMeta(); } }, '✕'));
    rows.push([item.id, row]); list.append(row);
  };
  inv.items.forEach(addRow);
  const id = el('input', { type: 'text', placeholder: 'item id, e.g. herb_azure_grass' });
  const qty = el('input', { type: 'text', value: '1', size: 6 });
  const add = () => {
    const key = id.value.trim(); if (!key || !NUM.test(qty.value.trim())) return toast('Enter an item id and a numeric quantity.');
    const item = { id: key, quantity: qty.value.trim() }; inv.items.push(item); addRow(item); edits++; updateMeta(); id.value = '';
  };
  return el('div', {}, el('div', { class: 'tools' }, searchBox('Filter items…', q => rows.forEach(([k, r]) => r.hidden = !k.toLowerCase().includes(q)))),
    list, el('h2', {}, 'Add item'), el('div', { class: 'tools' }, id, qty, el('button', { onclick: add }, 'Add')));
}

/** Lazy tree: children are only built when a node is first opened, so large saves stay fast. */
function treeNode(key, val, path) {
  if (val === null || typeof val !== 'object') return leafRow(key, path);
  const count = Array.isArray(val) ? `[${val.length}]` : `{${Object.keys(val).length}}`;
  const d = el('details', {}, el('summary', {}, key, el('small', {}, count)));
  d.addEventListener('toggle', () => {
    if (!d.open || d.dataset.built) return;
    d.dataset.built = 1;
    for (const [k, v] of Object.entries(val)) d.append(treeNode(k, v, [...path, k]));
  });
  return d;
}
function leaves(o, path = [], out = []) {
  for (const [k, v] of Object.entries(o)) v && typeof v === 'object' ? leaves(v, [...path, k], out) : out.push([...path, k]);
  return out;
}
function tree() {
  const root = el('div', { class: 'tree' }), results = el('div', { hidden: true });
  for (const [k, v] of Object.entries(S.data)) root.append(treeNode(k, v, [k]));
  const index = leaves(S.data).map(p => [p, p.join('.').toLowerCase()]);
  const search = q => {
    results.replaceChildren(); results.hidden = !q; root.hidden = !!q;
    if (!q) return;
    const hits = index.filter(([, s]) => s.includes(q)).slice(0, 150);
    results.append(el('p', { class: 'hint' }, `${hits.length === 150 ? '150+' : hits.length} matches (path search)`),
      ...hits.map(([p]) => leafRow(p.join('.'), p)));
  };
  return el('div', {}, el('div', { class: 'tools' }, searchBox('Search by key path, e.g. spiritStones or realm.stage…', search)), root, results);
}

function rawJson() {
  const ta = el('textarea', { spellcheck: 'false', 'aria-label': 'Raw save JSON' }, JSON.stringify(S.data, null, 2));
  const msg = el('span', { class: 'error' });
  const apply = () => {
    try {
      const d = JSON.parse(ta.value);
      if (!d || typeof d.state !== 'object') throw new Error('Root must contain a "state" object.');
      S.data = d; edits++; updateMeta(); msg.textContent = ''; toast('JSON applied.');
    } catch (e) { msg.textContent = 'Invalid JSON: ' + e.message; }
  };
  return el('div', {}, el('div', { class: 'tools' }, el('button', { onclick: apply }, 'Apply JSON'), msg), ta);
}

const TABS = { Essentials: essentials, Unlocks: unlocks, Inventory: inventory, 'Data tree': tree, 'Raw JSON': rawJson };
function showTab(name) {
  document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', b.textContent === name));
  $('#panel').replaceChildren(TABS[name]());
}

// ---------- load / export ----------
function download(text, name, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  el('a', { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function load(file) {
  $('#err').textContent = '';
  try {
    const original = await file.text();
    const { data, format } = decode(original);
    if (!data.state || typeof data.state !== 'object') throw new Error('This does not look like a cultivator save (missing "state").');
    S = { data, format, name: file.name, original }; edits = 0;
    $('#drop').hidden = true; $('#editor').hidden = false; $('#backup').hidden = false;
    $('#tabs').replaceChildren(...Object.keys(TABS).map(n => el('button', { role: 'tab', onclick: () => showTab(n) }, n)));
    updateMeta(); showTab('Essentials');
  } catch (e) { $('#err').textContent = 'Could not load file: ' + e.message; }
}
function exportSave() {
  try {
    if (!S.data.state) throw new Error('"state" is missing.');
    const text = encode(S.data, S.format);
    // Verification: the output must decode back to exactly what we meant to write.
    if (JSON.stringify(decode(text).data) !== JSON.stringify(S.data)) throw new Error('Round-trip check failed.');
    download(text, S.name);
    toast('Saved. Replace your game file with the download.');
  } catch (e) { toast('Export blocked: ' + e.message); }
}

const drop = $('#drop');
$('#file').addEventListener('change', e => e.target.files[0] && load(e.target.files[0]));
['dragover', 'dragenter'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => e.dataTransfer.files[0] && load(e.dataTransfer.files[0]));
$('#export').addEventListener('click', exportSave);
$('#backup').addEventListener('click', () => S && download(S.original, 'backup-' + S.name));
