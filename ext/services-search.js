/**
 * services-search.js — محرّك البحث في دليل الخدمات + واجهته
 * ------------------------------------------------------------------
 * مستشفى الأنهار التخصصي
 *
 * - المحرّك دوال نقية (norm / tokenize / search / buildReply) تُصدَّر لـ Node
 *   من أجل ext/tools/test-search.js، وتعمل في المتصفح كما هي.
 * - الواجهة تعمل فقط عند وجود DOM.
 * - لا يُستخدم innerHTML إطلاقًا مع نص الزائر أو الكتالوج (textContent فقط).
 * - لا يُرسل نص البحث إلى أي خادم ولا يُخزَّن في أي مكان
 *   (الانتقال من الصفحة الرئيسية يستخدم #hash فقط، ولا يصل إلى الخادم).
 * - كل النصوص تأتي من /ext/data/search-responses.json
 *   والرقم من /ext/data/contact.json (لا رقم مكتوب في هذا الملف).
 */
(function (global) {
  'use strict';

  /* ============================ 1) تطبيع ============================ */

  var DIACRITICS = /[\u064B-\u0652\u0670\u0640]/g;

  function norm(s) {
    if (!s) return '';
    return String(s)
      .replace(DIACRITICS, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ئ/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[\u200e\u200f]/g, '')
      .replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x660); })
      .replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 0x6f0); })
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* كلمات الصياغة التي تُتجاهل عند المطابقة */
  var STOPWORDS = new Set(
    ['هل', 'يوجد', 'عندكم', 'لديكم', 'متوفر', 'توفر', 'فحص', 'تحليل', 'اشعه', 'عمليه', 'لكم', 'عندك', 'لو', 'اريد', 'ابحث', 'عن', 'في', 'من', 'هو', 'هي'].map(norm)
  );

  /* بادئات تُزال للمطابقة فقط (لا تُغيّر الاسم المعروض) */
  var PREFIXES = ['وال', 'بال', 'كال', 'فال', 'لل', 'ال', 'و'];

  function stripPrefix(t) {
    for (var i = 0; i < PREFIXES.length; i++) {
      var p = PREFIXES[i];
      if (t.length > p.length + 1 && t.indexOf(p) === 0) return t.slice(p.length);
    }
    return t;
  }

  function tokenizeName(name) {
    return norm(name).split(' ').map(stripPrefix).filter(Boolean);
  }

  function tokenizeQuery(q, allowStandalone) {
    var words = norm(q).split(' ').map(stripPrefix).filter(Boolean);
    var meaningful = words.filter(function (t) { return (t.length >= 2 || /^\d+$/.test(t)) && !STOPWORDS.has(t); });
    // اسم نوع الخدمة وحده استعلام حقيقي؛ لا يطبق ذلك على بقايا المرادفات.
    if (allowStandalone !== false && !meaningful.length && words.length === 1 && ['فحص', 'تحليل', 'اشعه', 'عمليه'].indexOf(words[0]) !== -1) return words;
    return meaningful;
  }

  /* لعناصر البحث فقط: كلمات مميزة فريدة، دون أدوات أو نص لاتيني. */
  var SEARCH_ONLY_STOPWORDS = new Set(['اكثر', 'من', 'في', 'مع', 'و', 'على', 'الي', 'عن', 'هل', 'يوجد', 'عندكم', 'لديكم', 'متوفر', 'توفر', 'فحص', 'تحليل', 'اشعه', 'عمليه', 'لكم', 'عندك', 'لو', 'اريد', 'ابحث', 'هو', 'هي'].map(norm));
  function searchOnlyTokens(text) {
    var seen = new Set();
    norm(text).split(' ').forEach(function (word) {
      if (!word || SEARCH_ONLY_STOPWORDS.has(word) || /^[a-z]+$/.test(word)) return;
      var token = stripPrefix(word);
      if ((token.length >= 2 || /^\d+$/.test(token)) && !SEARCH_ONLY_STOPWORDS.has(token)) seen.add(token);
    });
    return Array.from(seen);
  }

  function phraseTokens(text) {
    return norm(text).split(' ').filter(function (word) {
      return word && !SEARCH_ONLY_STOPWORDS.has(word) && !/^[a-z]+$/.test(word);
    }).map(stripPrefix).filter(function (word) {
      return (word.length >= 2 || /^\d+$/.test(word)) && !SEARCH_ONLY_STOPWORDS.has(word);
    });
  }

  function searchOnlyBest(raw, items, config) {
    if (!config || !Number.isFinite(config.minCoverage) || config.minCoverage <= 0 || config.minCoverage > 1 || !Number.isInteger(config.minWords) || config.minWords < 1) return null;
    var query = searchOnlyTokens(raw);
    if (query.length < config.minWords) return null;
    var querySet = new Set(query), best = null, bestCoverage = -1;
    items.forEach(function (item) {
      if (!item.searchOnly) return;
      var original = phraseTokens(item.name), phrase = phraseTokens(raw);
      var numbers = original.filter(function (word) { return /^\d+$/.test(word); });
      if (item.numberRequired && (!numbers.length || !numbers.every(function (number) { return phrase.indexOf(number) !== -1; }))) return;
      var words = searchOnlyTokens(item.name);
      if (!words.length) return;
      var matched = words.filter(function (word) { return querySet.has(word); }).length;
      var coverage = matched / words.length;
      if (coverage >= config.minCoverage && coverage > bestCoverage) {
        best = item;
        bestCoverage = coverage;
      }
    });
    return best;
  }

  // المقارنة لا تقتطع واوًا أصلية مثل «ولادة»؛ أدوات التعريف والجر المعرفة فقط.
  var YES_CONNECTORS = new Set(['من','في','مع','و','او','الي','على','عن'].map(norm));
  var YES_FILLERS = new Set(['هل','يوجد','عندكم','لديكم','متوفر','توفر','لكم','عندك','لو','اريد','ابحث','هو','هي'].map(norm));
  function wholeWordTokens(text, isQuery, keepParentheses) {
    var source = keepParentheses ? String(text || '') : String(text || '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ');
    // الواو قبل همزة القطع كما في «وإيكو» أداة عطف؛ لا نحذفها من «ولادة».
    source = source.replace(/(^|[\s(])و(?=[أإآ])/g, '$1');
    return norm(source).split(' ').filter(Boolean).filter(function (word) {
      return !YES_CONNECTORS.has(word) && !(isQuery && YES_FILLERS.has(word)) && !/^\d+$/.test(word) && !/^[a-z]$/.test(word);
    }).map(function (word) {
      if (/^(وال|بال|كال|فال)/.test(word) && word.length > 5) return word.slice(3);
      if (/^لل/.test(word) && word.length > 3) return word.slice(2);
      if (/^ال/.test(word) && word.length > 3) return word.slice(2);
      return word;
    }).filter(function (word) {return word && !YES_CONNECTORS.has(word);});
  }
  function wholeWordMatch(query, name, minCoverage) {
    var q = wholeWordTokens(query, true), words = wholeWordTokens(name, false);
    var queryNumbers = norm(query).split(' ').filter(function (word) { return /^\d+$/.test(word); });
    var nameNumbers = norm(name).split(' ').filter(function (word) { return /^\d+$/.test(word); });
    if (!queryNumbers.every(function (number) { return nameNumbers.indexOf(number) !== -1; })) return false;
    if (!q.length || !words.length) return false;
    var distinct = Array.from(new Set(words)), qset = new Set(q);
    var matches = distinct.filter(function (word) { return qset.has(word); }).length;
    return q.every(function (word) { return distinct.indexOf(word) !== -1; }) && matches / distinct.length >= (Number.isFinite(minCoverage) ? minCoverage : 0.6);
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length;
    if (Math.abs(m - n) > 2) return 99;
    var prev = new Array(n + 1), cur = new Array(n + 1), i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= n; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      var tmp = prev; prev = cur; cur = tmp;
    }
    return prev[n];
  }

  /** درجة مطابقة كلمة استعلام بكلمة اسم: 2 تام، 1.5 بادئة، 1 تقريبي، 0 لا */
  function tokenScore(qt, nt) {
    if (qt === nt) return 2;
    if (qt.length >= 5 && nt.length >= 5 && (nt.indexOf(qt) === 0 || qt.indexOf(nt) === 0)) return 1.5;
    if (qt.length >= 5 && nt.length >= 5 && Math.abs(qt.length - nt.length) <= 1 && levenshtein(qt, nt) <= 1) return 1;
    return 0;
  }

  /* ============================ 2) البحث ============================ */

  /**
   * @param {string} query نص الزائر
   * @param {object} data  { items: [...], synonyms: [...], responses: {...} }
   * @returns {{type:string, best:object|null, options:array, emergency:boolean, query:string}}
   */
  function search(query, data) {
    var raw = String(query == null ? '' : query);
    var qNorm = norm(raw);
    var items = (data && data.items) || [];
    var synonyms = (data && data.synonyms) || [];
    var result = { type: 'idle', best: null, options: [], emergency: false, query: raw };

    /* سطر الطوارئ — يظهر مع أي رد */
    var emergencyWords = ((data && data.responses && data.responses.emergency) || {}).keywords || [];
    result.emergency = emergencyWords.some(function (kw) {
      return qNorm.indexOf(norm(kw)) !== -1;
    });

    var hints = (data && data.categoryHints) || {};
    var hintKey = Object.keys(hints).find(function (key) { return norm(key) === qNorm; });
    if (hintKey && ['diagnostics', 'surgery'].indexOf(hints[hintKey]) !== -1) {
      result.type = 'category';
      result.categoryHint = hints[hintKey];
      return result;
    }
    var tokens = wholeWordTokens(raw, true).filter(function (t) { return !STOPWORDS.has(t); });
    if (qNorm.length < 2 || tokens.length === 0) {
      if (!result.emergency) return result;
      result.type = 'none';
      return result;
    }

    // صياغة شبيهة بالوسوم ليست استعلام خدمة؛ لا تطابق أرقامها خدمات أخرى.
    if (/[<>]/.test(raw)) { result.type = 'none'; return result; }

    /* قواعد استبعاد الاستعلامات: لا نُظهر تطابقات جزئية مضللة لعبارة مستبعدة.
       الاستثناء اليدوي يعمل إذا أصبح عنصر يحمل العبارة منشورًا. */
    var blocked = ((data && data.excludedTerms) || []).some(function (term) {
      var n = norm(term);
      return n && qNorm.indexOf(n) !== -1 && !items.some(function (it) { return norm(it.name).indexOf(n) !== -1; });
    });
    var blockedQuery = ((data && data.blockedQueries) || []).some(function (phrase) {
      return qNorm === norm(phrase) && !items.some(function (item) {
        var names = tokenizeName(item.name);
        return tokens.every(function (token) { return names.indexOf(token) !== -1; });
      });
    });
    if (blocked || blockedQuery) { result.type = 'none'; return result; }

    var onlyMatch = searchOnlyBest(raw, items, data && data.searchOnlyMatch);
    if (onlyMatch && wholeWordMatch(raw, onlyMatch.name, data && data.yesMatch && data.yesMatch.coverageMin)) {
      result.type = 'strong';
      result.best = onlyMatch;
      return result;
    }

    /* --- المرادفات المعتمدة (approved) --- */
    var padded = ' ' + qNorm + ' ';
    var bestSyn = null;
    for (var s = 0; s < synonyms.length; s++) {
      var syn = synonyms[s];
      if (syn.approved !== true) continue;
      var pn = norm(syn.phrase);
      if (!pn) continue;
      if (padded.indexOf(' ' + pn + ' ') !== -1 || (pn.length >= 3 && qNorm === pn)) {
        if (!bestSyn || pn.length > norm(bestSyn.phrase).length) bestSyn = syn;
      }
    }

    if (bestSyn) {
      var remainder = padded.replace(' ' + norm(bestSyn.phrase) + ' ', ' ');
      var restTokens = tokenizeQuery(remainder, false);
      var target = items.filter(function (it) { return !it.searchOnly && it.id === bestSyn.targetId; })[0] || null;
      if (target && bestSyn.tier === 'specific' && restTokens.length === 0) {
        result.type = 'strong';
        result.best = target;
        return result;
      }
      /* مرادف عام أو بقي كلام: نتائج كخيارات، والهدف أولًا */
      var others = [];
      findMatches(tokens, items).forEach(function (m) {
        if (!m.item.searchOnly && !others.some(function (o) { return o.id === m.item.id; })) others.push(m.item);
      });
      result.type = others.length ? 'weak' : 'none';
      result.options = others.slice(0, 5);
      return result;
    }

    /* --- مطابقة عادية --- */
    var matches = findMatches(tokens, items.filter(function (item) { return !item.searchOnly; }));
    if (!matches.length) {
      result.type = 'none';
      return result;
    }

    // البادئة والتهجئة التقريبية تصلح للاقتراح فقط، ولا تكفي لإثبات التوفر.
    if (matches.some(function (m) { return m.matchedAll; })) matches = matches.filter(function (m) { return m.matchedAll; });
    var full = matches.filter(function (m) { return wholeWordMatch(raw, m.item.name, data && data.yesMatch && data.yesMatch.coverageMin); });
    if (full.length) {
      result.type = 'strong';
      result.best = full[0].item;
      // المطابقات التقريبية الأخرى تبقى خيارات لا تأكيدًا للتوفر.
      result.options = matches.filter(function (m) { return m.matchedAll && m.item.id !== result.best.id; }).slice(0, 3).map(function (m) { return m.item; });
      return result;
    }

    result.type = 'weak';
    result.options = matches.filter(function (m) { return !m.item.searchOnly; }).slice(0, 5).map(function (m) { return m.item; });
    if (!result.options.length) result.type = 'none';
    return result;
  }

  function findMatches(tokens, items) {
    var scored = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var nts = wholeWordTokens(it.name, true, true);
      var total = 0, matchedCount = 0, allWhole = true;
      for (var t = 0; t < tokens.length; t++) {
        var best = 0;
        for (var n = 0; n < nts.length; n++) {
          var sc = tokenScore(tokens[t], nts[n]);
          if (sc > best) best = sc;
          if (best === 2) break;
        }
        if (best > 0) { matchedCount++; total += best; if (best < 2) allWhole = false; }
      }
      if (matchedCount === 0) continue;
      scored.push({
        item: it,
        score: total,
        matchedAll: matchedCount === tokens.length,
        matchedCount: matchedCount,
        allWhole: allWhole,
      });
    }
    scored.sort(function (a, b) {
      if (a.allWhole !== b.allWhole) return a.allWhole ? -1 : 1;
      if (a.matchedAll !== b.matchedAll) return a.matchedAll ? -1 : 1;
      if (b.score !== a.score) return b.score - a.score;
      if (a.matchedAll && tokens.length >= 2 && !!a.item.searchOnly !== !!b.item.searchOnly) return a.item.searchOnly ? -1 : 1;
      /* الخدمة السريرية أولى من الخدمة الإدارية عند التعادل */
      var ra = typeof a.item.rank === 'number' ? a.item.rank : 50;
      var rb = typeof b.item.rank === 'number' ? b.item.rank : 50;
      if (ra !== rb) return ra - rb;
      return a.item.name.length - b.item.name.length;
    });
    return scored;
  }

  /* ============================ 3) بناء الرد ============================ */

  function fill(tpl, vars) {
    return String(tpl || '').replace(/\{(\w+)\}/g, function (m, k) {
      return vars[k] === undefined || vars[k] === null ? m : String(vars[k]);
    });
  }

  function truncate(str, max) {
    var s = String(str || '').replace(/\s+/g, ' ').trim();
    return s.length > max ? s.slice(0, max).trim() : s;
  }

  /**
   * @returns {{lines:string[], options:array, whatsappUrl:string, whatsappText:string, best:object|null}}
   */
  function buildReply(result, data) {
    var responses = data.responses || {};
    var contact = data.contact || {};
    var display = contact.whatsappDisplay || '';
    var btn = responses.whatsappButton || {};
    var out = { lines: [], options: [], whatsappUrl: '', whatsappText: '', best: result.best || null };

    if (result.emergency && responses.emergency) {
      out.lines.push(fill(responses.emergency.text, { whatsappDisplay: display }));
    }

    if (result.type === 'strong' && result.best) {
      var group = (responses.groups || {})[result.best.group] || (responses.groups || {}).general || {};
      out.lines.push(fill(group.text, { name: result.best.name, category: result.best.category, whatsappDisplay: display }));
      out.options = result.options || [];
      if (out.options.length && responses.weakMatch && responses.weakMatch.text) out.lines.push(responses.weakMatch.text);
      out.whatsappText = fill(btn.messageWithService, { name: result.best.name });
    } else if (result.type === 'category') {
      var labels = {diagnostics:'فحوصات تشخيصية', surgery:'عمليات وجراحة'};
      out.categoryHint = {slug:result.categoryHint, text:'تصفّح قسم ' + labels[result.categoryHint] + ' في دليل الخدمات'};
    } else if (result.type === 'weak') {
      out.lines.push((responses.weakMatch || {}).text || '');
      out.options = result.options || [];
      out.whatsappText = out.options.length
        ? fill(btn.messageWithService, { name: out.options[0].name })
        : fill(btn.messageWithoutService, { query: truncate(result.query, btn.queryMaxLength || 80) });
    } else if (result.type === 'none') {
      var notFound = responses.notFound || {};
      out.lines.push(fill(notFound.text, { whatsappDisplay: display }));
      out.whatsappText = fill(btn.messageWithoutService, { query: truncate(result.query, btn.queryMaxLength || 80) });
    } else {
      return out; /* idle: لا شيء */
    }

    out.lines = out.lines.filter(Boolean);
    if (out.whatsappText && contact.whatsappNumber) {
      out.whatsappUrl = 'https://wa.me/' + contact.whatsappNumber + '?text=' + encodeURIComponent(out.whatsappText);
    }
    return out;
  }

  var Engine = {
    norm: norm,
    tokenizeQuery: tokenizeQuery,
    tokenizeName: tokenizeName,
    wholeWordMatch: wholeWordMatch,
    search: search,
    buildReply: buildReply,
    fill: fill,
    truncate: truncate,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  global.ServicesSearchEngine = Engine;

  /* ============================ 4) الواجهة ============================ */

  if (typeof document === 'undefined') return;

  // document.currentScript is captured synchronously, not when a later event fires.
  var scriptTag = document.currentScript || document.querySelector('script[src*="services-search.js"]');
  var scriptBase = scriptTag && scriptTag.src ? new URL('.', scriptTag.src).href : new URL('ext/', document.baseURI).href;
  var DATA_URLS = {
    index: new URL('data/services-index.json', scriptBase).href,
    responses: new URL('data/search-responses.json', scriptBase).href,
    contact: new URL('data/contact.json', scriptBase).href,
    guide: new URL('../services/', scriptBase).href,
  };
  var cache = null;
  var pending = null;
  function fromBundle(bundle) {
    if (!bundle || !bundle.index || !Array.isArray(bundle.index.items) || !bundle.responses || !bundle.contact) throw new Error('بيانات بحث غير صالحة');
    return { items: bundle.index.items, synonyms: bundle.index.synonyms || [], excludedTerms: bundle.index.excludedTerms || [], blockedQueries: bundle.index.blockedQueries || [], searchOnlyMatch: bundle.index.searchOnlyMatch, yesMatch: bundle.index.yesMatch, categoryHints: bundle.index.categoryHints, responses: bundle.responses, contact: bundle.contact };
  }
  function loadJSON(url) {
    return fetch(url, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  function loadData() {
    if (cache) return Promise.resolve(cache);
    if (global.ServicesSearchData) {
      try { cache = fromBundle(global.ServicesSearchData); return Promise.resolve(cache); }
      catch (e) { /* try fetch fallback */ }
    }
    if (!pending) pending = Promise.all([loadJSON(DATA_URLS.index), loadJSON(DATA_URLS.responses), loadJSON(DATA_URLS.contact)])
      .then(function (res) { cache = fromBundle({index:res[0], responses:res[1], contact:res[2]}); return cache; })
      .catch(function (error) { pending = null; throw error; });
    return pending;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  // فهرس النتائج يخزن مسارات نسبية إلى جذر نسخة الموقع، لا جذر النطاق.
  function resultLink(item) {
    if (!item || item.searchOnly || !item.url || !/^(?:services\/|offers\.html(?:[?#]|$))/.test(item.url)) return null;
    var link = el('a', 'ss-result-link', 'عرض التفاصيل');
    link.href = new URL(item.url, new URL('../', scriptBase)).href;
    link.setAttribute('aria-label', 'عرض تفاصيل ' + item.name);
    return link;
  }

  /** تظليل الكلمة المطابقة دون أي HTML */
  function highlight(name, tokens) {
    var frag = document.createDocumentFragment();
    var nNorm = norm(name);
    var lower = nNorm;
    var marks = [];
    tokens.forEach(function (t) {
      var idx = lower.indexOf(t);
      if (idx === -1) return;
      marks.push([idx, idx + t.length]);
    });
    marks.sort(function (a, b) { return a[0] - b[0]; });
    /* دمج التداخلات */
    var merged = [];
    marks.forEach(function (m) {
      var last = merged[merged.length - 1];
      if (last && m[0] <= last[1]) last[1] = Math.max(last[1], m[1]);
      else merged.push(m.slice());
    });
    if (!merged.length) {
      frag.appendChild(document.createTextNode(name));
      return frag;
    }
    var pos = 0;
    merged.forEach(function (m) {
      if (m[0] > pos) frag.appendChild(document.createTextNode(name.slice(pos, m[0])));
      frag.appendChild(el('mark', null, name.slice(m[0], m[1])));
      pos = m[1];
    });
    if (pos < name.length) frag.appendChild(document.createTextNode(name.slice(pos)));
    return frag;
  }

  function init(root) {
    var input = root.querySelector('[data-services-search-input]');
    var button = root.querySelector('[data-services-search-button]');
    var panel = root.querySelector('[data-services-search-panel]');
    var status = root.querySelector('[data-services-search-status]');
    if (!input || !panel) return;

    var data = null;
    var items = [];       /* عناصر الخيارات القابلة للتنقل */
    var activeIndex = -1;

    loadData()
      .then(function (d) {
        data = d;
        var q = '';
        if (location.hash.indexOf('#q=') === 0) q = decodeURIComponent(location.hash.slice(3));
        if (q) input.value = q;
        if (input.value) run(input.value);
      })
      .catch(function () {
        var target = status || panel;
        if (!target) return;
        target.textContent = 'تعذر تحميل البحث، ';
        var link = el('a', null, 'تصفح الدليل');
        link.href = DATA_URLS.guide;
        target.appendChild(link);
      });

    function clearPanel() {
      while (panel.firstChild) panel.removeChild(panel.firstChild);
      items = [];
      activeIndex = -1;
    }

    function setActive(i) {
      if (!items.length) return;
      items.forEach(function (n) { n.classList.remove('is-active'); });
      activeIndex = (i + items.length) % items.length;
      items[activeIndex].classList.add('is-active');
      items[activeIndex].scrollIntoView({ block: 'nearest' });
    }

    function whatsappButton(text, label, aria) {
      var a = el('a', 'ss-wa');
      a.href = text;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', aria);
      var icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('width', '20');
      icon.setAttribute('height', '20');
      icon.setAttribute('aria-hidden', 'true');
      icon.setAttribute('focusable', 'false');
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('fill', 'currentColor');
      path.setAttribute('d', 'M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.06c-.24.68-1.4 1.3-1.93 1.35-.53.05-1.02.24-3.45-.72-2.92-1.15-4.77-4.15-4.92-4.34-.15-.2-.87-1.16-.87-2.21 0-1.05.55-1.57.75-1.78.2-.22.43-.27.58-.27.15 0 .3.01.43.02.14.01.33-.05.51.39.19.44.64 1.57.7 1.68.06.12.1.25.02.4-.08.15-.12.24-.24.37-.12.13-.25.29-.36.39-.12.12-.24.24-.11.47.14.24.61 1.01 1.31 1.63.9.8 1.66 1.05 1.9 1.17.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.53-.12.22.08 1.36.64 1.6.76.24.12.4.18.46.28.06.1.06.58-.18 1.26z');
      icon.appendChild(path);
      a.appendChild(icon);
      var span = el('span', null, label);
      a.appendChild(span);
      return a;
    }

    function render(result) {
      clearPanel();
      var reply = buildReply(result, data);
      if (reply.lines.length) {
        var p = el('p', 'ss-reply');
        reply.lines.forEach(function (line, i) {
          if (i) p.appendChild(document.createElement('br'));
          p.appendChild(document.createTextNode(line));
        });
        panel.appendChild(p);
      }
      if (reply.categoryHint) {
        var categoryLink = el('a', 'ss-result-link', reply.categoryHint.text);
        categoryLink.href = new URL('services/' + reply.categoryHint.slug, new URL('../', scriptBase)).href;
        panel.appendChild(categoryLink);
      }
      var bestLink = resultLink(reply.best);
      if (bestLink) {
        panel.appendChild(bestLink);
        var share = el('button', 'ss-result-link', 'مشاركة');
        share.type = 'button';
        share.setAttribute('data-clinical-share', bestLink.href);
        share.setAttribute('aria-label', 'مشاركة ' + reply.best.name);
        panel.appendChild(share);
      }

      if (reply.options.length) {
        var list = el('ul', 'ss-options');
        list.setAttribute('role', 'list');
        reply.options.forEach(function (opt) {
          var li = el('li');
          var btn = el('button', 'ss-option');
          btn.type = 'button';
          btn.setAttribute('data-id', opt.id);
          var optionName = el('span', 'ss-option-name');
          optionName.appendChild(highlight(opt.name, tokenizeQuery(input.value)));
          btn.appendChild(optionName);
          btn.appendChild(el('span', 'ss-option-cat', opt.category));
          btn.addEventListener('click', function () {
            var r = search(opt.name, data);
            render(r);
            input.value = opt.name;
          });
          li.appendChild(btn);
          var details = resultLink(opt);
          if (details) li.appendChild(details);
          list.appendChild(li);
          items.push(btn);
        });
        panel.appendChild(list);
      }

      if (reply.whatsappUrl) {
        var wrap = el('div', 'ss-wa-wrap');
        wrap.appendChild(whatsappButton(reply.whatsappUrl, data.responses.whatsappButton.label, data.responses.whatsappButton.ariaLabel));
        panel.appendChild(wrap);
      }

      if (status) {
        var n = (reply.options.length || 0) + (reply.best ? 1 : 0);
        status.textContent = result.type === 'idle' ? '' : result.type === 'category' ? 'قسم في دليل الخدمات' : n ? 'نتائج: ' + n : 'لا نتائج';
      }
      activeIndex = -1;
    }

    function run(q) {
      if (!data) return;
      var query = String(q || '').trim();
      if (tokenizeQuery(query).length === 0 && query.replace(/\s/g, '').length < 2) {
        clearPanel();
        if (status) status.textContent = '';
        return;
      }
      render(search(query, data));
    }

    var timer = null;
    var composing = false;
    function queueInput() {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () { run(input.value); }, 120);
    }
    input.addEventListener('compositionstart', function () { composing = true; window.clearTimeout(timer); });
    input.addEventListener('compositionend', function () { composing = false; queueInput(); });
    input.addEventListener('input', function (e) { if (!composing && !e.isComposing) queueInput(); });

    var linkMode = root.getAttribute('data-services-search-mode') === 'link';
    function goToGuide() {
      var v = String(input.value || '').trim();
      location.href = DATA_URLS.guide + (v ? '#q=' + encodeURIComponent(v) : '');
    }
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIndex + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIndex - 1); }
      else if (e.key === 'Escape') { clearPanel(); input.value = ''; input.focus(); }
      else if (e.key === 'Enter' && !composing && !e.isComposing) {
        e.preventDefault();
        if (activeIndex >= 0 && items[activeIndex]) items[activeIndex].click();
        else if (linkMode) goToGuide();
        else run(input.value);
      }
    });

    if (button) {
      button.addEventListener('click', function (e) {
        e.preventDefault();
        if (linkMode) goToGuide(); else run(input.value);
      });
    }

    /* مربع الرئيسية ينتقل للدليل دون إرسال الاستعلام إلى الخادم. */
    if (linkMode) {
      var form = root.querySelector('form');
      if (form) form.addEventListener('submit', function (e) { e.preventDefault(); goToGuide(); });
    }
  }

  Engine.init = init;
  document.querySelectorAll('[data-services-search]').forEach(init);
})(typeof window !== 'undefined' ? window : globalThis);
