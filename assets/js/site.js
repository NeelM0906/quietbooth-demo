(() => {
  const CFG = window.QB_CONFIG || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const store = {
    all(kind) { try { return JSON.parse(localStorage.getItem(`qb.${kind}`)) || []; } catch { return []; } },
    add(kind, record) { try { localStorage.setItem(`qb.${kind}`, JSON.stringify([...this.all(kind), record])); } catch {} }
  };

  async function send(kind, fields) {
    const record = { kind, ref: `QB-${Math.random().toString(36).slice(2, 7).toUpperCase()}`, createdAt: new Date().toISOString(), ...fields };
    const endpoint = kind === 'appointment' ? CFG.appointment?.endpoint : CFG.appointment?.formEndpoint;
    if (endpoint) {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(record) });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
    }
    store.add(kind, record);
    return record;
  }

  function header() {
    const el = $('[data-header]');
    if (!el) return;
    const overHero = document.body.classList.contains('has-hero');
    let last = scrollY;
    const update = () => {
      const y = scrollY;
      el.classList.toggle('is-solid', !overHero || y > 40);
      el.classList.toggle('is-hidden', y > 480 && y > last + 2 && !document.body.classList.contains('menu-open') && !el.contains(document.activeElement));
      if (y < last - 2 || y < 480) el.classList.remove('is-hidden');
      last = y;
    };
    update();
    addEventListener('scroll', update, { passive: true });
  }

  function menu() {
    const panel = $('[data-menu]'), openBtn = $('[data-menu-open]'), closeBtn = $('[data-menu-close]');
    if (!panel) return;
    const focusables = () => $$('a, button', panel);
    const close = () => {
      panel.hidden = true;
      document.body.classList.remove('menu-open');
      document.body.style.overflow = '';
      openBtn.setAttribute('aria-expanded', 'false');
      openBtn.focus();
    };
    openBtn.addEventListener('click', () => {
      panel.hidden = false;
      document.body.classList.add('menu-open');
      document.body.style.overflow = 'hidden';
      openBtn.setAttribute('aria-expanded', 'true');
      closeBtn.focus();
    });
    closeBtn.addEventListener('click', close);
    panel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') return close();
      if (e.key !== 'Tab') return;
      const f = focusables(), first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    });
  }

  function reveal() {
    const els = $$('.reveal');
    if (reduced || !('IntersectionObserver' in window)) return els.forEach((el) => el.classList.add('is-in'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const sibs = [...en.target.parentElement.children].filter((c) => c.classList.contains('reveal'));
        en.target.style.transitionDelay = `${Math.min(sibs.indexOf(en.target), 3) * 120}ms`;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    els.forEach((el) => io.observe(el));
  }

  function parallax() {
    const els = $$('[data-parallax]');
    if (reduced || !els.length) return;
    let ticking = false;
    const run = () => {
      const vh = innerHeight;
      els.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        el.style.transform = `translate3d(0, ${((r.top + r.height / 2 - vh / 2) * -0.06).toFixed(1)}px, 0)`;
      });
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
    run();
  }

  function cursor() {
    const targets = $$('[data-cursor]');
    if (!finePointer || reduced || !targets.length) return;
    const dot = document.createElement('div');
    dot.className = 'cursor';
    dot.setAttribute('aria-hidden', 'true');
    document.body.append(dot);
    let x = 0, y = 0, cx = 0, cy = 0, raf = 0;
    const loop = () => {
      cx += (x - cx) * 0.18; cy += (y - cy) * 0.18;
      dot.style.translate = `${cx}px ${cy}px`;
      raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.3 ? requestAnimationFrame(loop) : 0;
    };
    addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
    targets.forEach((t) => {
      t.addEventListener('pointerenter', (e) => { dot.textContent = t.dataset.cursor; cx = x = e.clientX; cy = y = e.clientY; dot.style.translate = `${cx}px ${cy}px`; dot.classList.add('is-on'); });
      t.addEventListener('pointerleave', () => dot.classList.remove('is-on'));
    });
  }

  function lightbox() {
    const zs = $$('[data-zoom]');
    if (!zs.length) return;
    const d = document.createElement('dialog');
    d.className = 'lightbox';
    d.setAttribute('aria-label', 'Enlarged image');
    d.innerHTML = '<img alt=""><button type="button" class="lightbox-close">Close<span class="visually-hidden"> enlarged image</span></button>';
    document.body.appendChild(d);
    const im = d.querySelector('img');
    zs.forEach((z) => z.addEventListener('click', () => {
      im.src = z.dataset.zoom; im.alt = z.dataset.zoomAlt || '';
      d.showModal();
    }));
    d.querySelector('button').addEventListener('click', () => d.close());
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    im.addEventListener('click', () => im.classList.toggle('is-zoomed'));
  }
  function gallery() {
    const g = $('[data-gallery]');
    if (!g) return;
    const slides = $$('[data-slide]', g), thumbs = $$('[data-thumb]', g);
    const show = (i) => {
      slides.forEach((s, k) => { s.classList.toggle('is-active', k === i); s.setAttribute('aria-hidden', String(k !== i)); s.inert = k !== i; });
      thumbs.forEach((t, k) => t.setAttribute('aria-pressed', String(k === i)));
    };
    show(0);
    thumbs.forEach((t, i) => {
      t.addEventListener('click', () => show(i));
      t.addEventListener('keydown', (e) => {
        const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        const n = (i + d + thumbs.length) % thumbs.length;
        thumbs[n].focus(); show(n);
      });
    });
  }

  function filter() {
    const btns = $$('[data-filter]');
    if (!btns.length) return;
    const status = $('[data-filter-status]');
    btns.forEach((b) => b.addEventListener('click', () => {
      const kind = b.dataset.filter;
      btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      let n = 0;
      $$('.look').forEach((l) => { const on = kind === 'all' || l.dataset.kind === kind || (kind === 'jewelry' && l.dataset.kind !== 'watch'); l.hidden = !on; if (on) { n++; l.querySelectorAll('.reveal').forEach((r) => r.classList.add('is-in')); } });
      $$('.chapter').forEach((c) => { c.hidden = !$$('.look', c).some((l) => !l.hidden); });
      status.textContent = `Showing ${n} ${kind === 'all' ? 'pieces' : kind === 'watch' ? 'watches' : 'jewelry pieces'}`;
    }));
  }

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function validate(form) {
    const problems = [];
    $$('.field-error', form).forEach((e) => e.remove());
    $$('[aria-invalid]', form).forEach((e) => e.removeAttribute('aria-invalid'));
    $$('[data-required]', form).forEach((el) => {
      const ok = el.type === 'checkbox' ? el.checked : el.type === 'email' ? EMAIL.test(el.value.trim()) : el.value.trim() !== '';
      if (ok) return;
      problems.push({ el, msg: el.dataset.required });
      if (el.type !== 'hidden') {
        el.setAttribute('aria-invalid', 'true');
        const id = `${el.name}-err`;
        const msg = Object.assign(document.createElement('p'), { className: 'field-error', id, textContent: el.dataset.required });
        (el.closest('.check') || el).after(msg);
        el.setAttribute('aria-describedby', [el.getAttribute('aria-describedby'), id].filter((x) => x && !x.endsWith('-err')).concat(id).join(' '));
      }
    });
    const box = $('[data-errors]', form);
    if (box) {
      box.hidden = !problems.length;
      box.innerHTML = problems.length ? `<h2>Please check ${problems.length === 1 ? 'one detail' : `${problems.length} details`}</h2><ul>${problems.map((p, i) => `<li><a href="#" data-err="${i}">${p.msg}</a></li>`).join('')}</ul>` : '';
      $$('[data-err]', box).forEach((a) => a.addEventListener('click', (e) => {
        e.preventDefault();
        const { el } = problems[+a.dataset.err];
        const target = el.type === 'hidden' ? $(el.dataset.focus) : el;
        target?.focus();
      }));
      if (problems.length) box.focus();
    } else if (problems.length) problems[0].el.focus();
    return !problems.length;
  }

  const fields = (form) => {
    const out = {};
    new FormData(form).forEach((v, k) => {
      if (v instanceof File) { if (v.name) (out[k] ||= []).push(v.name); return; }
      if (k === 'interests') (out[k] ||= []).push(v); else out[k] = v;
    });
    return out;
  };
  const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function inlineForm(kind, done) {
    $$(`[data-form="${kind}"]`).forEach((form) => form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = $('.form-status', form);
      if (!validate(form)) { if (status) { status.className = 'form-status is-error'; status.textContent = 'Please complete the highlighted field.'; } return; }
      const btn = $('button[type="submit"]', form);
      btn.disabled = true;
      try {
        const rec = await send(kind, fields(form));
        done(form, rec, status);
      } catch {
        status.className = 'form-status is-error';
        status.textContent = `Something went wrong. Please write to ${CFG.email} instead.`;
      } finally { btn.disabled = false; }
    }));
  }

  function forms() {
    inlineForm('list', (form, rec, status) => {
      form.reset();
      status.className = 'form-status';
      status.textContent = 'Thank you. You are on the list, and the next private lookbook will come to you first.';
    });
    inlineForm('inquiry', (form, rec, status) => {
      form.reset();
      status.className = 'form-status';
      status.textContent = `Received, reference ${rec.ref}. A host will reply privately within one working day.`;
    });
    const consign = $('[data-form="consign"]');
    if (consign) consign.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validate(consign)) return;
      const rec = await send('consign', fields(consign));
      const box = consign.parentElement.querySelector('[data-confirm]');
      consign.hidden = true;
      box.hidden = false;
      box.innerHTML = `<p class="ref">Reference ${rec.ref}</p><h2 class="display-l">Thank you. It is in confidence.</h2><p class="lede">A host will reply to ${escHtml(rec.email)} within one working day with a first, candid opinion.</p><ol><li>We read your note and look at any photographs.</li><li>We suggest a time to see the piece, here or with you.</li><li>You receive a written offer or consignment terms.</li></ol><p class="actions"><a class="btn btn-line" href="../lookbook/">Browse the lookbook</a></p>`;
      box.focus();
    });
  }

  function appointment() {
    const root = $('[data-appointment]');
    if (!root) return;
    const form = $('[data-form="appointment"]', root);
    const PIECES = JSON.parse($('#qb-pieces')?.textContent || '{}');
    const ap = CFG.appointment;
    const DAY = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const hoursFor = (d) => CFG.hours.find((h) => h.days.includes(DAY[d.getDay()]));
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const first = new Date(today); first.setDate(first.getDate() + ap.leadDays);
    const lastDay = new Date(today); lastDay.setDate(lastDay.getDate() + ap.horizonDays);
    const open = (d) => d >= first && d <= lastDay && !!hoursFor(d);
    const longDate = (s) => parse(s).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const clock = (t) => { const [h, m] = t.split(':').map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); };
    const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

    const state = { month: new Date(first.getFullYear(), first.getMonth(), 1), date: '', time: '', pieces: [] };
    const dateInput = form.elements.date, timeInput = form.elements.time, piecesInput = form.elements.pieces;
    const sum = (k, v) => { $(`[data-sum="${k}"]`, root).textContent = v; };

    function renderCal(focusIso) {
      const m = state.month;
      $('[data-cal-title]', root).textContent = m.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      $('[data-cal-prev]', root).disabled = m <= new Date(first.getFullYear(), first.getMonth(), 1);
      $('[data-cal-next]', root).disabled = new Date(m.getFullYear(), m.getMonth() + 1, 1) > lastDay;
      const startPad = (m.getDay() + 6) % 7;
      const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      let html = '<tr>';
      for (let i = 0; i < startPad; i++) html += '<td></td>';
      for (let d = 1; d <= days; d++) {
        const date = new Date(m.getFullYear(), m.getMonth(), d), id = iso(date), on = open(date);
        html += `<td><button type="button" class="day${+date === +today ? ' is-today' : ''}" data-date="${id}" aria-pressed="${state.date === id}" aria-label="${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${on ? '' : ', closed'}"${on ? '' : ' disabled'}>${d}</button></td>`;
        if ((startPad + d) % 7 === 0 && d < days) html += '</tr><tr>';
      }
      html += '</tr>';
      $('[data-cal-body]', root).innerHTML = html;
      if (focusIso) $(`[data-date="${focusIso}"]`, root)?.focus();
    }

    function slotsFor(id) {
      const h = hoursFor(parse(id));
      const toMin = (t) => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };
      const out = [];
      for (let t = toMin(h.open); t + ap.slotMinutes <= toMin(h.close); t += ap.slotMinutes) {
        const s = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
        out.push({ s, taken: hash(id + s) % 4 === 0 });
      }
      return out;
    }

    function renderSlots() {
      const box = $('[data-slots]', root);
      if (!state.date) { box.innerHTML = '<p class="muted">Choose a date to see available times.</p>'; return; }
      box.innerHTML = `<p class="muted small">${longDate(state.date)}. Times are New York time. Struck-through times are already taken.</p>` + slotsFor(state.date).map(({ s, taken }) => `<label><input type="radio" name="slot" value="${s}"${taken ? ' disabled' : ''}${state.time === s ? ' checked' : ''}><span>${clock(s)}${taken ? '<span class="visually-hidden">, taken</span>' : ''}</span></label>`).join('');
    }

    function pick(id) {
      state.date = id; state.time = '';
      dateInput.value = id; timeInput.value = '';
      sum('date', longDate(id)); sum('time', 'Not chosen');
      renderCal(id); renderSlots();
    }

    function renderPieces() {
      piecesInput.value = state.pieces.join(',');
      $('[data-chosen]', root).innerHTML = state.pieces.map((s) => `<li>${escHtml(PIECES[s].name)}<button type="button" data-remove="${s}" aria-label="Remove ${escHtml(PIECES[s].name)}">×</button></li>`).join('');
      sum('pieces', state.pieces.length ? state.pieces.map((s) => PIECES[s].name).join(', ') : 'Open to suggestion');
    }

    root.addEventListener('click', (e) => {
      const day = e.target.closest('[data-date]');
      if (day && !day.disabled) pick(day.dataset.date);
      if (e.target.closest('[data-cal-prev]')) { state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1); renderCal(); }
      if (e.target.closest('[data-cal-next]')) { state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1); renderCal(); }
      const rm = e.target.closest('[data-remove]');
      if (rm) { state.pieces = state.pieces.filter((s) => s !== rm.dataset.remove); renderPieces(); $('[data-piece-select]', root).focus(); }
    });
    $('[data-cal-body]', root).addEventListener('keydown', (e) => {
      const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      const cur = e.target.closest('[data-date]');
      if (!step || !cur) return;
      e.preventDefault();
      const d = parse(cur.dataset.date);
      for (let i = 0; i < 21; i++) {
        d.setDate(d.getDate() + step);
        if (d < first || d > lastDay) return;
        if (open(d)) {
          if (d.getMonth() !== state.month.getMonth()) state.month = new Date(d.getFullYear(), d.getMonth(), 1);
          renderCal(iso(d));
          return;
        }
      }
    });
    root.addEventListener('change', (e) => {
      if (e.target.name === 'slot') { state.time = e.target.value; timeInput.value = state.time; sum('time', clock(state.time)); }
      if (e.target.name === 'party') sum('party', e.target.value);
      if (e.target.matches('[data-piece-select]') && e.target.value) {
        if (!state.pieces.includes(e.target.value)) state.pieces.push(e.target.value);
        e.target.value = '';
        renderPieces();
      }
    });

    const wanted = new URLSearchParams(location.search).get('piece');
    if (wanted && PIECES[wanted]) {
      state.pieces = [wanted];
      if (PIECES[wanted].status === 'reserved') form.elements.note.value = `Please tell me if the ${PIECES[wanted].name} becomes available again.`;
    }
    renderCal(); renderSlots(); renderPieces();

    const pending = store.all('appointment').filter((r) => parse(r.date) >= today).pop();
    if (pending) {
      const box = $('[data-pending]', root);
      box.hidden = false;
      box.innerHTML = `<p>You already have a request for <strong>${longDate(pending.date)} at ${clock(pending.time)}</strong>, reference ${escHtml(pending.ref)}. You may request another below.</p>`;
    }

    function ics(r) {
      const dt = (d, t) => d.replace(/-/g, '') + 'T' + t.replace(':', '') + '00';
      const [h, m] = r.time.split(':').map(Number);
      const endMin = h * 60 + m + ap.slotMinutes;
      const end = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
      const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//QuietBooth//Appointment//EN', 'BEGIN:VEVENT', `UID:${r.ref}@quietbooth`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART;TZID=America/New_York:${dt(r.date, r.time)}`, `DTEND;TZID=America/New_York:${dt(r.date, end)}`, `SUMMARY:Private viewing, ${CFG.brand} (requested)`, `LOCATION:${CFG.address.replace(/,/g, '\\,')}`, `DESCRIPTION:Reference ${r.ref}. Awaiting confirmation. Bring photo ID for the front desk.`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      return URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validate(form)) return;
      const btn = $('button[type="submit"]', form);
      btn.disabled = true;
      let r;
      try { r = await send('appointment', fields(form)); }
      catch { btn.disabled = false; const box = $('[data-errors]', form); box.hidden = false; box.innerHTML = `<h2>We could not send your request</h2><p>Please call ${escHtml(CFG.phone)} or write to ${escHtml(CFG.email)}.</p>`; box.focus(); return; }
      const box = $('[data-confirm]', root);
      const rows = [['Date', longDate(r.date)], ['Time', `${clock(r.time)}, New York time`], ['Guests', r.party], ['Interested in', (r.interests || []).join(', ') || 'Not specified'], ['Pieces', state.pieces.map((s) => PIECES[s].name).join(', ') || 'Open to suggestion'], ['Language', r.language], ['Host', r.host || 'No preference'], ['We will confirm by', r.contactPref]];
      form.hidden = true;
      $('[data-pending]', root).hidden = true;
      box.hidden = false;
      box.innerHTML = `<p class="ref">Reference ${escHtml(r.ref)}</p><h2 class="display-l">Your request is with us, ${escHtml(r.name.split(' ')[0])}.</h2><p class="lede">This is a request, not yet a confirmation. A host will confirm by ${escHtml(r.contactPref.toLowerCase())} within one working day${r.noVoicemail ? ', without voicemail' : ''}.</p><dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${escHtml(v)}</dd></div>`).join('')}</dl><h3 class="eyebrow">What happens next</h3><ol><li>We check the room and prepare the pieces you asked about.</li><li>You receive a confirmation with the host's name and direct number.</li><li>On the day, bring photo identification for the front desk${r.discreetArrival ? '. We will meet you at the side entrance' : ''}.</li></ol><p class="actions"><a class="btn btn-solid" download="quietbooth-${escHtml(r.ref)}.ics" href="${ics(r)}">Add to calendar</a><a class="btn btn-line" href="../lookbook/">Continue to the lookbook</a><button type="button" class="btn btn-text" data-again>Request another time</button></p>`;
      sum('date', longDate(r.date)); sum('time', clock(r.time));
      box.focus();
      $('[data-again]', box).addEventListener('click', () => { location.href = location.pathname; });
      scrollTo({ top: root.offsetTop - 120, behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  header(); menu(); reveal(); parallax(); cursor(); gallery(); lightbox(); filter(); forms(); appointment();
})();
