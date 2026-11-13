export type BookmarkletLabels = {
  notFound: string
  found: string
  copy: string
  copied: string
  close: string
}

// Runs on web.whatsapp.com with the group info (or its "View all" members dialog) open:
// scrolls the member list, collects every name/number and shows them ready to copy.
// WhatsApp virtualizes long lists, so names are collected while scrolling step by step.
const SOURCE = `
(async () => {
  const ID = 'activehikes-wa-export';
  document.getElementById(ID)?.remove();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const outsideChats = el => !el.closest('#pane-side') && !el.closest('#main');
  const scrollable = el => el.scrollHeight > el.clientHeight + 40 && /(auto|scroll)/.test(getComputedStyle(el).overflowY);
  const titles = el => el.querySelectorAll('span[title]').length;

  const dialog = [...document.querySelectorAll('[role="dialog"]')].pop();
  const box = [...(dialog || document.body).querySelectorAll('div')]
    .filter(el => outsideChats(el) && scrollable(el))
    .sort((a, b) => titles(b) - titles(a))[0];
  if (!box || !titles(box)) { alert(L.notFound); return; }

  const names = new Set();
  const collect = () => {
    const rows = box.querySelectorAll('[role="listitem"], [role="row"]');
    const spans = rows.length
      ? [...rows].map(r => r.querySelector('span[title]')).filter(Boolean)
      : [...box.querySelectorAll('span[title]')];
    spans.forEach(s => { const t = (s.getAttribute('title') || '').trim(); if (t) names.add(t); });
  };

  box.scrollTop = 0;
  await sleep(400);
  let last = -1;
  for (let i = 0; i < 400 && box.scrollTop !== last; i++) {
    collect();
    last = box.scrollTop;
    box.scrollTop += Math.max(100, box.clientHeight * 0.7);
    await sleep(250);
  }
  collect();

  const text = [...names].join('\\n');
  const wrap = document.createElement('div');
  wrap.id = ID;
  wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font-family:sans-serif';
  const card = document.createElement('div');
  card.style.cssText = 'background:#fff;color:#1c1917;border-radius:16px;padding:20px;width:min(420px,90vw);box-shadow:0 10px 40px rgba(0,0,0,.3)';
  const title = document.createElement('div');
  title.textContent = L.found.replace('{count}', names.size);
  title.style.cssText = 'font-weight:700;margin-bottom:10px';
  const area = document.createElement('textarea');
  area.value = text;
  area.readOnly = true;
  area.style.cssText = 'width:100%;height:240px;border:1px solid #d6d3d1;border-radius:10px;padding:8px;font-size:13px;box-sizing:border-box';
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:12px';
  const btn = (label, bg, fg) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'border:0;border-radius:10px;padding:8px 14px;font-weight:600;cursor:pointer;background:' + bg + ';color:' + fg;
    return b;
  };
  const close = btn(L.close, '#e7e5e4', '#1c1917');
  const copy = btn(L.copy, '#059669', '#fff');
  close.onclick = () => wrap.remove();
  wrap.onclick = e => { if (e.target === wrap) wrap.remove(); };
  copy.onclick = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch { area.select(); document.execCommand('copy'); }
    copy.textContent = L.copied;
  };
  row.append(close, copy);
  card.append(title, area, row);
  wrap.append(card);
  document.body.append(wrap);
})();
`

export function buildBookmarklet(labels: BookmarkletLabels): string {
  const code = `const L = ${JSON.stringify(labels)};${SOURCE}`
  // void 0: a javascript: URL that evaluates to a value would replace the page with it
  return 'javascript:' + encodeURIComponent(`{${code}}void 0;`)
}
