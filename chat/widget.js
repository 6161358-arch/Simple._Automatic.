/* ==========================================================
   הצ'אט של פשוט. אוטומט. - חלון צ'אט עם סוכן AI ומעבר ליוסי
   נטען באתר: <script src="chat/widget.js" defer></script>
   פותחים מכל מקום בעמוד: window.SAChat.open()
   ========================================================== */
(() => {
  if (window.SAChat) return;

  // ✏️ הגדרות
  const API = 'https://n8n.srv1256019.hstgr.cloud/webhook/site-chat-7c2e'; // השער ב-n8n
  const TEASER_AFTER_MS = 9000;   // אחרי כמה זמן מופיעה הבועה "יש לכם שאלה?"
  const QUICK = ['מה זה בעצם אוטומציה?', 'רעיון לאוטומציה לעסק שלי', 'מה זה מייל פון?', 'אפשר לדבר עם יוסי?'];
  const WELCOME = 'שלום! 👋\nאני העוזר הדיגיטלי של **פשוט. אוטומט.**\nאפשר לשאול אותי כל דבר על אוטומציה לעסק, ואם צריך - אעביר אתכם ליוסי.';

  // ---------- אחסון בדפדפן (עטוף, כי לפעמים חסום) ----------
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
  };
  const rid = () => (crypto.randomUUID ? crypto.randomUUID() : 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
  let convId = store.get('sa_chat_conv'), token = store.get('sa_chat_token');
  const ensureIds = () => {
    if (!convId || !token) { convId = rid(); token = rid() + rid().slice(0, 8); store.set('sa_chat_conv', convId); store.set('sa_chat_token', token); }
  };

  // ---------- עיצוב ----------
  const css = `
  .sac, .sac * { box-sizing: border-box; }
  .sac { --navy:#0f2b46; --navy2:#123a5c; --teal:#008f80; --mint:#1cc7b2; --paper:#f4f8f7; --line:#0f2b461c; --muted:#5a6f80; --amber:#ffb000;
    font-family: 'Heebo', 'Arial Hebrew', Arial, sans-serif; direction: rtl; color: var(--navy); -webkit-font-smoothing: antialiased; }
  .sac [hidden] { display: none !important; }
  /* באתר יש סמן עכבר מעוצב שמוסתר מאחורי החלון - בתוך הצ'אט חוזרים לסמן הרגיל */
  .sac, .sac * { cursor: auto !important; }
  .sac button, .sac a, .sac [role=button], .sac .sac-chip { cursor: pointer !important; }
  .sac textarea { cursor: text !important; }
  .sac .sac-send:disabled { cursor: default !important; }

  /* כפתור הפתיחה */
  .sac-launch { position: fixed; right: 24px; bottom: 24px; z-index: 2147483000; width: 66px; height: 66px; border-radius: 50%; border: 0; cursor: pointer;
    background: radial-gradient(120% 120% at 30% 20%, #1d4d74 0%, var(--navy) 60%); color: #fff; display: grid; place-items: center;
    box-shadow: 0 14px 34px -10px #0f2b46aa, 0 0 0 0 #1cc7b266; transition: transform .35s cubic-bezier(.2,1.4,.4,1), box-shadow .3s; animation: sac-breathe 3.2s ease-in-out infinite; }
  .sac-launch:hover { transform: scale(1.07) rotate(-4deg); }
  .sac-launch:focus-visible { outline: 3px solid var(--mint); outline-offset: 3px; }
  @keyframes sac-breathe { 50% { box-shadow: 0 14px 34px -10px #0f2b46aa, 0 0 0 10px #1cc7b200; } 0%,100% { box-shadow: 0 14px 34px -10px #0f2b46aa, 0 0 0 0 #1cc7b255; } }
  .sac-launch svg { width: 30px; height: 30px; transition: transform .35s, opacity .25s; }
  .sac-launch .sac-x { position: absolute; opacity: 0; transform: rotate(-90deg) scale(.6); }
  .sac.open .sac-launch { animation: none; }
  .sac.open .sac-launch .sac-bubble-ic { opacity: 0; transform: rotate(90deg) scale(.6); }
  .sac.open .sac-launch .sac-x { opacity: 1; transform: none; }
  .sac-dots3 circle { animation: sac-blink 1.4s infinite; fill: var(--mint); }
  .sac-dots3 circle:nth-child(2) { animation-delay: .2s; } .sac-dots3 circle:nth-child(3) { animation-delay: .4s; }
  @keyframes sac-blink { 0%, 60%, 100% { opacity: .35; } 30% { opacity: 1; } }
  .sac-unread { position: absolute; top: -2px; left: -2px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px; background: var(--amber); color: var(--navy);
    font: 900 12px/22px 'Heebo', Arial, sans-serif; text-align: center; box-shadow: 0 0 0 3px #fff; }

  /* בועת הזמנה */
  .sac-teaser { position: fixed; right: 24px; bottom: 102px; z-index: 2147483000; max-width: 260px; background: #fff; color: var(--navy); border-radius: 18px 18px 4px 18px;
    padding: 14px 16px 14px 34px; box-shadow: 0 18px 40px -16px #0f2b4666, 0 0 0 1px var(--line); font-size: 15px; line-height: 1.45; cursor: pointer;
    animation: sac-pop .5s cubic-bezier(.2,1.3,.4,1); }
  .sac-teaser b { display: block; font-weight: 900; font-size: 16px; margin-bottom: 2px; }
  .sac-teaser button { position: absolute; top: 8px; left: 8px; width: 22px; height: 22px; border: 0; border-radius: 50%; background: var(--paper); color: var(--muted); cursor: pointer; font-size: 13px; line-height: 22px; }
  @keyframes sac-pop { from { opacity: 0; transform: translateY(12px) scale(.9); } }

  /* החלון */
  .sac-panel { position: fixed; right: 24px; bottom: 104px; z-index: 2147483001; width: 392px; height: min(640px, calc(100vh - 130px)); background: var(--paper);
    border-radius: 26px; overflow: hidden; display: grid; grid-template-rows: auto 1fr auto; box-shadow: 0 40px 80px -30px #0f2b4680, 0 0 0 1px #0f2b4614;
    transform-origin: 90% 100%; animation: sac-in .42s cubic-bezier(.2,1.2,.4,1); }
  @keyframes sac-in { from { opacity: 0; transform: translateY(18px) scale(.94); } }
  .sac-head { position: relative; padding: 18px 20px 20px; color: #fff; overflow: hidden;
    background: linear-gradient(135deg, var(--navy) 0%, var(--navy2) 55%, #0d5a63 100%); }
  .sac-head::after { content: ''; position: absolute; inset: auto -40px -60px auto; width: 190px; height: 190px; border-radius: 50%;
    background: radial-gradient(circle, #1cc7b244, transparent 65%); pointer-events: none; }
  .sac-head-row { display: flex; align-items: center; gap: 12px; position: relative; z-index: 1; }
  .sac-mark { width: 46px; height: 46px; border-radius: 15px; background: #ffffff14; border: 1px solid #ffffff22; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 10px; flex: none; }
  .sac-mark i { border-radius: 50%; background: var(--mint); animation: sac-dot 2.6s ease-in-out infinite; }
  .sac-mark i:nth-child(2n) { background: #fff; }
  .sac-mark i:nth-child(1){animation-delay:0s}.sac-mark i:nth-child(2){animation-delay:.15s}.sac-mark i:nth-child(3){animation-delay:.3s}
  .sac-mark i:nth-child(4){animation-delay:.15s}.sac-mark i:nth-child(5){animation-delay:.3s}.sac-mark i:nth-child(6){animation-delay:.45s}
  .sac-mark i:nth-child(7){animation-delay:.3s}.sac-mark i:nth-child(8){animation-delay:.45s}.sac-mark i:nth-child(9){animation-delay:.6s}
  @keyframes sac-dot { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(.55); opacity: .55; } }
  .sac-title { font-weight: 900; font-size: 19px; letter-spacing: -.3px; line-height: 1.15; }
  .sac-status { font-size: 13px; opacity: .85; display: flex; align-items: center; gap: 7px; margin-top: 3px; }
  .sac-status i { width: 8px; height: 8px; border-radius: 50%; background: var(--mint); box-shadow: 0 0 0 3px #1cc7b233; }
  .sac-status.human i { background: var(--amber); box-shadow: 0 0 0 3px #ffb00033; }
  .sac-close { margin-inline-start: auto; width: 36px; height: 36px; border-radius: 50%; border: 0; background: #ffffff14; color: #fff; cursor: pointer; font-size: 18px; display: grid; place-items: center; transition: background .2s; }
  .sac-close:hover { background: #ffffff2a; }

  .sac-body { overflow-y: auto; padding: 18px 16px 8px; display: flex; flex-direction: column; gap: 10px; scroll-behavior: smooth; }
  .sac-body::-webkit-scrollbar { width: 6px; } .sac-body::-webkit-scrollbar-thumb { background: #0f2b4622; border-radius: 3px; }
  .sac-row { display: flex; gap: 8px; align-items: flex-end; animation: sac-rise .32s ease-out; }
  @keyframes sac-rise { from { opacity: 0; transform: translateY(8px); } }
  .sac-av { width: 30px; height: 30px; border-radius: 50%; flex: none; display: grid; place-items: center; font-size: 13px; font-weight: 900; color: #fff;
    background: linear-gradient(135deg, var(--navy), #0d5a63); }
  .sac-av.bot { display: grid; grid-template-columns: repeat(3, 4px); gap: 2.5px; place-content: center; }
  .sac-av.bot i { width: 4px; height: 4px; border-radius: 50%; background: var(--mint); }
  .sac-av.bot i:nth-child(2n) { background: #fff; }
  .sac-av.human { background: linear-gradient(135deg, #ffb000, #ff8a00); color: var(--navy); }
  .sac-b { max-width: 80%; padding: 11px 14px; border-radius: 18px; font-size: 15px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
  .sac-row.them .sac-b { background: #fff; border-top-right-radius: 5px; box-shadow: 0 1px 0 #0f2b460d, 0 0 0 1px #0f2b460f; }
  .sac-row.me { flex-direction: row-reverse; }
  .sac-row.me .sac-b { background: linear-gradient(135deg, var(--teal), #00a593); color: #fff; border-top-left-radius: 5px; }
  .sac-who { font-size: 11.5px; color: var(--muted); margin: 0 40px -4px 0; font-weight: 500; }
  .sac-b b { font-weight: 700; }
  .sac-b a { color: inherit; text-decoration: underline; }
  .sac-typing .sac-b { display: inline-flex; gap: 5px; align-items: center; padding: 14px 16px; }
  .sac-typing .sac-b span { width: 7px; height: 7px; border-radius: 50%; background: #0f2b4655; animation: sac-jump 1.2s infinite; }
  .sac-typing .sac-b span:nth-child(2) { animation-delay: .15s; } .sac-typing .sac-b span:nth-child(3) { animation-delay: .3s; }
  @keyframes sac-jump { 0%, 60%, 100% { transform: none; } 30% { transform: translateY(-5px); background: var(--teal); } }
  .sac-note { align-self: center; text-align: center; font-size: 13px; color: var(--navy); background: #fff4d6; border: 1px solid #ffb00055; padding: 9px 14px; border-radius: 14px; max-width: 92%; animation: sac-rise .3s; }
  .sac-note.ok { background: #e1f3f0; border-color: #008f8033; }
  .sac-chips { display: flex; flex-direction: column; align-items: flex-start; gap: 7px; padding: 2px 38px 4px 0; }
  .sac-chip { border: 1.5px solid #008f8044; background: #fff; color: var(--teal); border-radius: 999px; padding: 7px 13px; font: 500 14px 'Heebo', Arial, sans-serif; cursor: pointer; transition: all .2s; }
  .sac-chip:hover { background: var(--teal); color: #fff; border-color: var(--teal); transform: translateY(-1px); }

  .sac-foot { padding: 10px 14px 12px; background: var(--paper); }
  .sac-box { display: flex; align-items: flex-end; gap: 8px; background: #fff; border-radius: 22px; padding: 6px 6px 6px 6px; box-shadow: 0 0 0 1.5px var(--line); transition: box-shadow .2s; }
  .sac-box:focus-within { box-shadow: 0 0 0 2px var(--teal), 0 6px 18px -8px #008f8055; }
  .sac-box textarea { flex: 1; border: 0; outline: 0; resize: none; background: transparent; font: 400 15.5px/1.45 'Heebo', Arial, sans-serif; color: var(--navy); padding: 9px 10px; max-height: 120px; min-height: 40px; direction: rtl; }
  .sac-box textarea::placeholder { color: #8aa0ae; }
  .sac-send { width: 42px; height: 42px; flex: none; border-radius: 50%; border: 0; cursor: pointer; background: var(--teal); color: #fff; display: grid; place-items: center; transition: transform .15s, opacity .2s, background .2s; }
  .sac-send:disabled { opacity: .3; cursor: default; }
  .sac-send:not(:disabled):hover { background: #007a6d; }
  .sac-send:not(:disabled):active { transform: scale(.9); }
  .sac-legal { text-align: center; font-size: 11.5px; color: #8aa0ae; margin-top: 7px; }
  .sac-legal a { color: inherit; }

  @media (max-width: 520px) {
    .sac-launch { right: 16px; bottom: calc(16px + env(safe-area-inset-bottom)); width: 60px; height: 60px; }
    .sac-teaser { right: 16px; bottom: 88px; }
    .sac-panel { inset: 0; width: 100%; height: 100%; height: 100dvh; border-radius: 0; animation-name: sac-in-m; }
    .sac-foot { padding: 10px 14px calc(12px + env(safe-area-inset-bottom)); }
    .sac-body { padding-inline: 14px; }
    .sac.open .sac-launch { display: none; }
    @keyframes sac-in-m { from { opacity: 0; transform: translateY(30px); } }
  }
  @media (prefers-reduced-motion: reduce) {
    .sac *, .sac-launch { animation: none !important; transition: none !important; }
  }`;

  // ---------- מבנה ----------
  const root = document.createElement('div');
  root.className = 'sac';
  root.innerHTML = `
    <style>${css}</style>
    <div class="sac-teaser" hidden role="button" tabindex="0" aria-label="פתיחת הצ'אט">
      <button type="button" aria-label="סגירה">✕</button>
      <b>יש לכם שאלה? 👋</b>אני כאן לענות, ואפשר גם לדבר עם יוסי.
    </div>
    <section class="sac-panel" hidden role="dialog" aria-label="צ'אט עם פשוט. אוטומט.">
      <header class="sac-head">
        <div class="sac-head-row">
          <div class="sac-mark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <div>
            <div class="sac-title">פשוט. אוטומט.</div>
            <div class="sac-status"><i></i><span>עוזר דיגיטלי · עונה מיד</span></div>
          </div>
          <button class="sac-close" type="button" aria-label="סגירת הצ'אט">✕</button>
        </div>
      </header>
      <div class="sac-body" aria-live="polite"></div>
      <footer class="sac-foot">
        <div class="sac-box">
          <textarea rows="1" maxlength="1500" placeholder="כתבו הודעה..." aria-label="הודעה"></textarea>
          <button class="sac-send" type="button" disabled aria-label="שליחה">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 5l-7 7 7 7"/></svg>
          </button>
        </div>
        <div class="sac-legal">השיחה נשמרת אצל פשוט. אוטומט. · <a href="privacy.html" target="_blank" rel="noopener">מדיניות פרטיות</a></div>
      </footer>
    </section>
    <button class="sac-launch" type="button" aria-label="פתיחת צ'אט">
      <svg class="sac-bubble-ic" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M16 4C8.8 4 3 8.9 3 15c0 3.2 1.6 6.1 4.2 8.1L6 28l5.6-2.6c1.4.4 2.9.6 4.4.6 7.2 0 13-4.9 13-11S23.2 4 16 4z" fill="#fff"/>
        <g class="sac-dots3"><circle cx="10.5" cy="15" r="1.9"/><circle cx="16" cy="15" r="1.9"/><circle cx="21.5" cy="15" r="1.9"/></g>
      </svg>
      <svg class="sac-x" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      <span class="sac-unread" hidden>1</span>
    </button>`;
  (document.body || document.documentElement).appendChild(root);
  const q = (s) => root.querySelector(s);
  const panel = q('.sac-panel'), body = q('.sac-body'), ta = q('textarea'), sendBtn = q('.sac-send');
  const launch = q('.sac-launch'), teaser = q('.sac-teaser'), unreadEl = q('.sac-unread'), statusEl = q('.sac-status');

  // ---------- מצב ----------
  let isOpen = false, lastId = 0, mode = 'bot', status = 'new', busy = false, unread = 0, started = false, typingEl = null, humanTypingEl = null;
  const shown = new Set();

  const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(https?:\/\/[^\s<]+[^\s<.,!?)])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

  function scrollDown() { body.scrollTop = body.scrollHeight; }
  function addMsg(role, text, opts = {}) {
    const me = role === 'visitor';
    const row = document.createElement('div');
    row.className = 'sac-row ' + (me ? 'me' : 'them');
    const av = me ? '' : role === 'human' ? '<div class="sac-av human" aria-hidden="true">י</div>' : '<div class="sac-av bot" aria-hidden="true">' + '<i></i>'.repeat(9) + '</div>';
    row.innerHTML = av + '<div class="sac-b">' + fmt(text) + '</div>';
    if (role === 'human' && !opts.noLabel) {
      const who = document.createElement('div');
      who.className = 'sac-who'; who.textContent = 'יוסי';
      body.appendChild(who);
    }
    body.appendChild(row);
    scrollDown();
    return row;
  }
  function addNote(text, ok) {
    const n = document.createElement('div');
    n.className = 'sac-note' + (ok ? ' ok' : ''); n.textContent = text;
    body.appendChild(n); scrollDown();
  }
  function showTyping(on, human) {
    const cur = human ? humanTypingEl : typingEl;
    if (on && !cur) {
      const el = addMsg(human ? 'human' : 'bot', '', { noLabel: true });
      el.classList.add('sac-typing'); el.querySelector('.sac-b').innerHTML = '<span></span><span></span><span></span>';
      if (human) humanTypingEl = el; else typingEl = el;
    } else if (!on && cur) {
      cur.remove(); if (human) humanTypingEl = null; else typingEl = null;
    }
    if (on) body.appendChild(human ? humanTypingEl : typingEl), scrollDown();
  }
  function setMode(m, s) {
    const was = mode, wasStatus = status;
    mode = m || mode; status = s || status;
    const human = mode === 'human';
    statusEl.classList.toggle('human', human);
    statusEl.querySelector('span').textContent = human ? (status === 'human' ? 'יוסי בשיחה' : 'השיחה הועברה ליוסי') : 'עוזר דיגיטלי · עונה מיד';
    if (started && was !== 'human' && human && status === 'waiting') addNote('⏳ העברתי את השיחה ליוסי. הוא יענה כאן בהקדם, ואפשר להמשיך לכתוב.');
    if (started && wasStatus !== 'human' && status === 'human') addNote('👋 יוסי הצטרף לשיחה', true);
    if (started && was === 'human' && !human) addNote('🤖 העוזר הדיגיטלי חזר לענות', true);
  }
  function welcome(withChips) {
    addMsg('bot', WELCOME);
    if (!withChips) return;
    const chips = document.createElement('div');
    chips.className = 'sac-chips';
    chips.innerHTML = QUICK.map((t) => '<button class="sac-chip" type="button">' + esc(t) + '</button>').join('');
    chips.addEventListener('click', (e) => { const b = e.target.closest('.sac-chip'); if (b) { chips.remove(); send(b.textContent); } });
    body.appendChild(chips);
  }
  function handle(j, fromPoll) {
    if (!j || !j.ok) return;
    let gotNew = false;
    for (const m of j.messages || []) {
      if (shown.has(m.id)) continue;
      shown.add(m.id); lastId = Math.max(lastId, m.id);
      if (m.role === 'visitor' && fromPoll === 'self') continue; // כבר מוצג
      if (m.role === 'visitor' && body.querySelector('[data-pending="1"]')) { body.querySelector('[data-pending="1"]').removeAttribute('data-pending'); continue; }
      showTyping(false, true);
      addMsg(m.role, m.text);
      if (m.role !== 'visitor') gotNew = true;
    }
    setMode(j.mode, j.status);
    showTyping(!!j.humanTyping && mode === 'human', true);
    if (gotNew && !isOpen) { unread++; unreadEl.textContent = unread; unreadEl.hidden = false; }
  }

  async function api(payload) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) });
    return r.json();
  }
  async function send(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    ensureIds();
    q('.sac-chips') && q('.sac-chips').remove();
    busy = true; sendBtn.disabled = true;
    const row = addMsg('visitor', text); row.setAttribute('data-pending', '1');
    ta.value = ''; ta.style.height = 'auto';
    if (mode !== 'human') setTimeout(() => busy && showTyping(true), 350);
    try {
      const j = await api({ action: 'send', convId, token, text, afterId: lastId, page: location.pathname });
      showTyping(false);
      if (!j.ok) {
        row.removeAttribute('data-pending');
        addNote(j.error === 'too_many' ? 'השיחה ארוכה מדי. אפשר להתקשר ליוסי: 053-3182643' : 'ההודעה לא נשלחה. נסו שוב בעוד רגע.');
      } else handle(j, 'send');
    } catch (e) {
      showTyping(false); row.removeAttribute('data-pending');
      addNote('אין חיבור כרגע. נסו שוב, או התקשרו: 053-3182643');
    }
    busy = false; sendBtn.disabled = !ta.value.trim();
  }
  async function poll() {
    if (!convId || !token || busy) return;
    try { handle(await api({ action: 'poll', convId, token, afterId: lastId }), 'poll'); } catch (e) {}
  }

  // ---------- פתיחה וסגירה ----------
  function open() {
    if (isOpen) return;
    isOpen = true; root.classList.add('open'); panel.hidden = false; teaser.hidden = true;
    store.sset('sa_chat_teased', '1');
    unread = 0; unreadEl.hidden = true;
    launch.setAttribute('aria-label', "סגירת הצ'אט");
    if (!started) {
      started = true;
      welcome(!convId);
      if (convId) poll();
    }
    setTimeout(() => ta.focus(), 250);
    scrollDown();
  }
  function close() {
    isOpen = false; root.classList.remove('open'); panel.hidden = true;
    launch.setAttribute('aria-label', "פתיחת צ'אט");
  }
  launch.addEventListener('click', () => (isOpen ? close() : open()));
  q('.sac-close').addEventListener('click', close);
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) close(); });
  teaser.addEventListener('click', (e) => { if (e.target.closest('button')) { teaser.hidden = true; store.sset('sa_chat_teased', '1'); return; } open(); });
  teaser.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });

  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; sendBtn.disabled = busy || !ta.value.trim(); });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(ta.value); } });
  sendBtn.addEventListener('click', () => send(ta.value));

  // בועת ההזמנה - פעם אחת בביקור
  if (!store.sget('sa_chat_teased')) setTimeout(() => { if (!isOpen) teaser.hidden = false; }, TEASER_AFTER_MS);

  // בדיקת הודעות חדשות: מהר כשהשיחה אצל יוסי, לאט כשלא
  (function loop() {
    const fast = mode === 'human';
    const wait = document.hidden ? 20000 : isOpen ? (fast ? 3000 : 8000) : (fast ? 8000 : 0);
    setTimeout(() => { if (wait) poll(); loop(); }, wait || 15000);
  })();
  // שיחה קיימת מביקור קודם: לבדוק אם יוסי ענה בינתיים
  if (convId) { started = false; api({ action: 'poll', convId, token, afterId: 0 }).then((j) => {
    if (!j || !j.ok) return;
    mode = j.mode || 'bot'; status = j.status || 'open';
    if (!isOpen && (j.messages || []).some((m) => m.role === 'human')) { unread = 1; unreadEl.textContent = '1'; unreadEl.hidden = false; }
  }).catch(() => {}); }

  // הסמן המעוצב של האתר (#cursor) נמצא מתחת לחלון: מסתירים אותו כשהעכבר על הצ'אט
  const siteCursor = () => document.getElementById('cursor');
  root.addEventListener('pointerover', () => { const c = siteCursor(); if (c) c.style.visibility = 'hidden'; });
  root.addEventListener('pointerout', (e) => { if (e.relatedTarget && root.contains(e.relatedTarget)) return; const c = siteCursor(); if (c) c.style.visibility = ''; });

  window.SAChat = { open, close };
})();
