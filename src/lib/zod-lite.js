class ZType {
  constructor(parseFn) { this._parse = parseFn; }
  parse(v) { return this._parse(v); }
  safeParse(v) { try { return { success: true, data: this.parse(v) }; } catch (e) { return { success: false, error: { issues: [e.issue || { path: [], message: e.message }] } }; } }
  optional() { return new ZType((v) => (v === undefined ? undefined : this.parse(v))); }
  nullable() { return new ZType((v) => (v === null ? null : this.parse(v))); }
  default(def) { return new ZType((v) => (v === undefined ? def : this.parse(v))); }
}
function err(path, message) { const e = new Error(message); e.issue = { path, message }; throw e; }

function decorateString(schema) {
  schema.max = function max(n) { const p = this._parse; this._parse = (v) => { v = p(v); if (v.length > n) err([], `String must contain at most ${n} character(s)`); return v; }; return this; };
  schema.min = function min(n, m) { const p = this._parse; this._parse = (v) => { v = p(v); if (v.length < n) err([], m || `String must contain at least ${n} character(s)`); return v; }; return this; };
  schema.trim = function trim() { const p = this._parse; this._parse = (v) => p(typeof v === 'string' ? v.trim() : v); return this; };
  schema.email = function email() { const p = this._parse; this._parse = (v) => { v = p(v); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) err([], 'Invalid email'); return v; }; return this; };
  return schema;
}
function string() { return decorateString(new ZType((v) => { if (typeof v !== 'string') err([], 'Expected string'); return v; })); }
function number() { const s = new ZType((v) => { if (typeof v !== 'number' || Number.isNaN(v)) err([], 'Expected number'); return v; }); s.min = (n) => { const p = s._parse; s._parse = (v) => { v = p(v); if (v < n) err([], `Number must be greater than or equal to ${n}`); return v; }; return s; }; s.max = (n) => { const p = s._parse; s._parse = (v) => { v = p(v); if (v > n) err([], `Number must be less than or equal to ${n}`); return v; }; return s; }; s.int = () => { const p = s._parse; s._parse = (v) => { v = p(v); if (!Number.isInteger(v)) err([], 'Expected integer'); return v; }; return s; }; s.nonnegative = () => s.min(0); return s; }
function boolean() { return new ZType((v) => { if (typeof v !== 'boolean') err([], 'Expected boolean'); return v; }); }
function enm(values) { return new ZType((v) => { if (!values.includes(v)) err([], 'Invalid enum value'); return v; }); }
function any() { return new ZType((v) => v); }
function union(schemas) { return new ZType((v) => { for (const s of schemas) { const r = s.safeParse(v); if (r.success) return r.data; } err([], 'Invalid input'); }); }
function array(schema) { const s = new ZType((v) => { if (!Array.isArray(v)) err([], 'Expected array'); return v.map((x, i) => { try { return schema.parse(x); } catch (e) { err([i, ...(e.issue?.path || [])], e.issue?.message || e.message); } }); }); s.min = (n) => { const p = s._parse; s._parse = (v) => { v = p(v); if (v.length < n) err([], `Array must contain at least ${n} element(s)`); return v; }; return s; }; s.max = (n) => { const p = s._parse; s._parse = (v) => { v = p(v); if (v.length > n) err([], `Array must contain at most ${n} element(s)`); return v; }; return s; }; return s; }
function record(schema) { return new ZType((v) => { if (!v || typeof v !== 'object' || Array.isArray(v)) err([], 'Expected object'); const out = {}; for (const k of Object.keys(v)) out[k] = schema.parse(v[k]); return out; }); }
function object(shape) { const s = new ZType((v) => { if (!v || typeof v !== 'object' || Array.isArray(v)) err([], 'Expected object'); const out = {}; for (const [k, sch] of Object.entries(shape)) { try { const parsed = sch.parse(v[k]); if (parsed !== undefined) out[k] = parsed; } catch (e) { err([k, ...(e.issue?.path || [])], e.issue?.message || e.message); } } if (s._strict) { for (const k of Object.keys(v)) if (!(k in shape)) err([k], 'Unrecognized key(s) in object'); } if (s._passthrough) { for (const k of Object.keys(v)) if (!(k in shape)) out[k] = v[k]; } return out; }); s.strict = () => { s._strict = true; return s; }; s.passthrough = () => { s._passthrough = true; return s; }; return s; }

const z = { string, number, boolean, enum: enm, any, union, array, record, object };
module.exports = { z };
