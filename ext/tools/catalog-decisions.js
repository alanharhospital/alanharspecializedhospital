'use strict';

// قرارات النشر مصدرها ملف مستقل؛ تحقق من الاسم يمنع انتقال قرار إلى ID تغيّر مع إعادة الاستخراج.
const fs = require('fs');
const path = require('path');
const FILE = path.resolve(__dirname, '..', 'data', 'catalog-decisions.json');
function load() { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
function normalize(s) {
  return String(s).normalize('NFKC').replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}
function apply(items, config) {
  const byId = new Map(items.map(i => [i.id, i]));
  for (const d of config.decisions) {
    const item = byId.get(d.id);
    if (!item || item.name !== d.name) throw new Error(`قرار لا يطابق المصدر: ${d.id} ${d.name}`);
    for (const key of ['publish', 'status', 'responseGroup', 'category', 'linkOnly', 'exactMatchMinWords', 'matchName', 'exactPhrases']) {
      if (d[key] !== undefined && d[key] !== null) item[key] = d[key];
    }
    for (const key of ['internalOnly', 'feeExcluded', 'excluded', 'hasNumber', 'searchOnly', 'exactMatchOnly', 'directoryHidden', 'numberRequired']) {
      if (d[key] === true) item[key] = true;
      else delete item[key];
    }
    if (d.excludedBy) item.excludedBy = d.excludedBy;
    else delete item.excludedBy;
    if (d.duplicateOf) item.duplicateOf = d.duplicateOf;
    else { delete item.duplicateOf; delete item.duplicateNote; }
  }
  for (const alias of config.approvedAliases || []) {
    if (!byId.has(alias.targetId) || alias.approved !== true || !['specific', 'generic'].includes(alias.tier)) {
      throw new Error(`مرادف غير صالح أو خدمة غير موجودة: ${alias.phrase}`);
    }
  }
  for (const item of items) {
    item.aliases = (config.approvedAliases || []).filter(a => a.targetId === item.id)
      .map(a => ({ phrase: a.phrase, tier: a.tier, approved: true }));
  }
  const overrides = new Set(config.overrides.map(o => typeof o === 'string' ? o : o.id));
  for (const id of overrides) if (!byId.has(id)) throw new Error(`معرف استثناء غير موجود: ${id}`);
  for (const item of items) {
    if (/[0-9٠-٩%٪]/.test(item.name)) item.hasNumber = true;
    const n = normalize(item.name);
    const matches = config.excludeRules.filter(term => n.includes(normalize(term)));
    if (matches.length) {
      item.excluded = true;
      if (matches.some(x => normalize(x) === normalize('بدل مخاطر'))) item.internalOnly = true;
      if (matches.some(x => normalize(x) === normalize('رسوم'))) item.feeExcluded = true;
      item.publish = false;
      if (!item.excludedBy) item.excludedBy = 'rule';
    }
    if ((config.excludedCategories || []).includes(item.category)) {
      item.excluded = true; item.publish = false;
      if (!item.excludedBy) item.excludedBy = 'category-rule';
    }
    if (overrides.has(item.id)) {
      delete item.excluded; delete item.internalOnly; delete item.feeExcluded; delete item.excludedBy;
      item.publish = true;
    }
    if (!item.excluded && /^(?:اجور|رسوم)(?:\s|$)/.test(n)) item.responseGroup = 'listed';
    if (item.category === 'عروض وباقات') item.linkOnly = true;
    if (config.listedCategories.includes(item.category) ||
        (item.hasNumber && /^(?:[0-9٠-٩]|أكثر\s+من(?:\s|$))/.test(item.name))) {
      item.responseGroup = 'listed';
    }
  }
  return items;
}
module.exports = { load, apply, normalize };
