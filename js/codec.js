// Save codec. The game writes: JSON -> UTF-8 -> XOR with a repeating key -> Base64.
// decode() also accepts plain JSON and plain Base64(JSON) so other tools' output loads too.
export const XOR_KEY = 'CultivationJS_SecretKey_2024';

const enc = new TextEncoder();
const dec = new TextDecoder('utf-8', { fatal: true });

const xor = bytes => bytes.map((b, i) => b ^ XOR_KEY.charCodeAt(i % XOR_KEY.length));
const b64decode = s => Uint8Array.from(atob(s.replace(/\s+/g, '')), c => c.charCodeAt(0));
const b64encode = bytes => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const parseObj = text => {
  try { const d = JSON.parse(text); return d && typeof d === 'object' ? d : null; } catch { return null; }
};

/** @returns {{data:object, format:'json'|'base64'|'xor-base64'}} */
export function decode(text) {
  text = text.replace(/^\uFEFF/, '').trim();
  let d = parseObj(text);
  if (d) return { data: d, format: 'json' };

  let bytes;
  try { bytes = b64decode(text); } catch { throw new Error('File is neither JSON nor valid Base64.'); }
  try { if ((d = parseObj(dec.decode(bytes)))) return { data: d, format: 'base64' }; } catch {}
  try { if ((d = parseObj(dec.decode(xor(bytes))))) return { data: d, format: 'xor-base64' }; } catch {}
  throw new Error('Unrecognised save format. The game may have changed its encoding.');
}

/** Re-encode to the same format the file was loaded in. */
export function encode(data, format) {
  const json = JSON.stringify(data);
  if (format === 'json') return json;
  const bytes = enc.encode(json);
  return b64encode(format === 'xor-base64' ? xor(bytes) : bytes);
}
