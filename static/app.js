// ── Changelog ─────────────────────────────────────────────────────────────────
const CHANGELOG = [
    { id: 12, date: '03/06', text: 'Sistema de feedback: botão "Enviar Feedback" na sidebar para todos os usuários' },
    { id: 11, date: '03/06', text: 'Figurinhas dentro das trocas (pendentes e passadas) agora têm ordenação por # ou ABC' },
    { id: 10, date: '03/06', text: 'Modal de troca: ordenação das listas de querer e oferecer (⭐ sugeridos, ABC, #)' },
    { id: 9,  date: '03/06', text: 'Notas de atualização agora abrem neste popup versionado' },
    { id: 8,  date: '03/06', text: 'Ordenação em todas as listas de trocas (↑↓ data, A–Z nome, status)' },
    { id: 7,  date: '02/06', text: 'Trocas passadas: botão "Ver ▶" mostra o que foi trocado em cada troca' },
    { id: 6,  date: '02/06', text: 'Validação: confirmar troca falha se figurinhas já foram usadas em outra negociação' },
    { id: 5,  date: '02/06', text: 'Finalizar troca atualiza álbum e repetidas de ambos automaticamente' },
    { id: 4,  date: '02/06', text: 'Trocas pendentes ficam visíveis mesmo após um lado já ter finalizado' },
    { id: 3,  date: '01/06', text: 'Propor troca: selecione múltiplas figurinhas — quantidades iguais obrigatórias' },
    { id: 2,  date: '01/06', text: 'Matches: escolha qualquer figurinha da lista ao propor troca, não só a primeira' },
    { id: 1,  date: '01/06', text: 'Correção do tamanho do logo no cabeçalho' },
];
const CHANGELOG_KEY = 'changelog_seen';

(function initChangelogBadge() {
    const seen = parseInt(localStorage.getItem(CHANGELOG_KEY) || '0');
    const unseen = CHANGELOG.filter(e => e.id > seen).length;
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    if (unseen > 0) {
        badge.textContent = unseen;
        badge.classList.remove('hidden');
    }
})();

function openChangelog() {
    const seen = parseInt(localStorage.getItem(CHANGELOG_KEY) || '0');
    document.getElementById('changelog-list').innerHTML = CHANGELOG.map(e => `
        <div class="changelog-entry${e.id > seen ? ' changelog-new' : ''}">
            <span class="changelog-date">${e.date}</span>
            <span class="changelog-text">${e.text}</span>
        </div>
    `).join('');
    document.getElementById('changelog-modal').classList.remove('hidden');
    localStorage.setItem(CHANGELOG_KEY, CHANGELOG[0].id);
    const badge = document.getElementById('notif-badge');
    if (badge) badge.classList.add('hidden');
}

function closeChangelog() {
    document.getElementById('changelog-modal').classList.add('hidden');
}

// ── Sidebar drawer ────────────────────────────────────────────────────────────
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const isOpen = sidebar.classList.contains('open');
    sidebar.classList.toggle('open', !isOpen);
    backdrop.classList.toggle('hidden', isOpen);
    backdrop.classList.toggle('visible', !isOpen);
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    sidebar.classList.remove('open');
    backdrop.classList.remove('visible');
    backdrop.classList.add('hidden');
}

// ── Theme ──────────────────────────────────────────────────────────────────────
function toggleDarkMode() {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    document.getElementById('theme-btn').textContent = next === 'dark' ? '☀️' : '🌙';
}

(function initTheme() {
    const t = localStorage.getItem('theme') || 'light';
    document.getElementById('theme-btn').textContent = t === 'dark' ? '☀️' : '🌙';
})();

// ── Wishlist mode ──────────────────────────────────────────────────────────────
let wishMode = false;

function toggleWishlistMode() {
    wishMode = !wishMode;
    const btn = document.getElementById('wish-btn');
    if (btn) { btn.classList.toggle('active', wishMode); btn.textContent = wishMode ? '⭐ Sair' : '⭐ Desejos'; }
    const sideBtn = document.getElementById('sidebar-wish-btn');
    if (sideBtn) { sideBtn.classList.toggle('active', wishMode); sideBtn.textContent = wishMode ? '⭐ Sair Desejos' : '⭐ Lista de Desejos'; }
    document.querySelectorAll('.sticker').forEach(s => {
        s.classList.toggle('wish-mode-on', wishMode && !s.classList.contains('checked'));
    });
}

function handleStickerClick(el) {
    if (!IS_OWN_ALBUM) return;
    if (wishMode && !el.classList.contains('checked')) {
        toggleWishlistItem(el);
        return;
    }
    toggleStickerOwned(el);
}

// Make stickers always clickable on own album
if (typeof IS_OWN_ALBUM !== 'undefined' && IS_OWN_ALBUM) {
    document.querySelectorAll('.sticker').forEach(s => s.classList.add('editable'));
}

// ── Change log ────────────────────────────────────────────────────────────────
const LOG_KEY = () => `wc_log_${typeof CURRENT_USER_ID !== 'undefined' ? CURRENT_USER_ID : 0}`;
const SAO_PAULO_TZ = 'America/Sao_Paulo';

function nowSP() {
    return new Date().toLocaleTimeString('pt-BR', { timeZone: SAO_PAULO_TZ, hour: '2-digit', minute: '2-digit' });
}

function loadLog() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY()) || '[]'); } catch { return []; }
}

function saveLog(log) {
    localStorage.setItem(LOG_KEY(), JSON.stringify(log.slice(0, 5)));
}

function logChange(country, number, owned) {
    const prefix = country.includes('(') ? country.split('(')[0].trim() : country;
    const entry = { country, prefix, number, owned, time: nowSP() };
    const log = [entry, ...loadLog()].slice(0, 5);
    saveLog(log);
    renderLog();
}

function renderLog() {
    const log = loadLog();
    const logEl = document.getElementById('change-log');
    const itemsEl = document.getElementById('log-items');
    if (!logEl || !itemsEl) return;

    if (log.length === 0) { logEl.classList.add('hidden'); return; }
    logEl.classList.remove('hidden');

    itemsEl.innerHTML = log.map((e, i) => `
        <div class="log-entry">
            <span class="log-icon ${e.owned ? 'log-add' : 'log-remove'}">${e.owned ? '✔' : '✕'}</span>
            <span class="log-text">${e.prefix} #${e.number}</span>
            <span class="log-time">${e.time}</span>
            <button class="log-undo" onclick="undoLog(${i})">Desfazer</button>
        </div>
    `).join('');
}

function undoLog(index) {
    const log = loadLog();
    const entry = log[index];
    if (!entry) return;

    fetch('/api/sticker/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: entry.country, number: entry.number }),
    })
        .then(r => r.json())
        .then(data => {
            const selector = `.sticker[data-country="${CSS.escape(entry.country)}"][data-number="${entry.number}"]`;
            document.querySelectorAll(selector).forEach(el => {
                el.classList.toggle('checked', data.owned);
                el.classList.remove('wished');
                updateCountryCount(el.closest('.country-card'));
            });
            updateGlobalStats();
            log.splice(index, 1);
            saveLog(log);
            renderLog();
            showToast(`${entry.prefix} #${entry.number} desfeito!`);
        })
        .catch(() => showToast('Erro ao desfazer.'));
}

function copyOwnedList() {
    const cards = document.querySelectorAll('.country-card');
    const lines = [];
    cards.forEach(card => {
        const prefix = card.dataset.prefix || '';
        const nums = [...card.querySelectorAll('.sticker.checked')]
            .map(s => s.dataset.number)
            .filter(Boolean)
            .sort((a, b) => parseInt(a) - parseInt(b));
        if (nums.length) lines.push(`${prefix} ${nums.join(' ')}`);
    });
    if (!lines.length) { showToast('Nenhuma figurinha marcada.'); return; }
    navigator.clipboard.writeText(lines.join('\n')).then(() => showToast('Figurinhas copiadas! ✔'));
}

function copyMissingList() {
    const rows = document.querySelectorAll('.missing-row');
    if (!rows.length) { showToast('Nenhuma figurinha faltante.'); return; }
    const lines = [`Figurinhas faltantes - Álbum WC 2026`];
    rows.forEach(row => {
        const prefix = row.dataset.prefix || '';
        const nums = row.querySelector('.missing-nums')?.textContent?.trim();
        if (prefix && nums) lines.push(`${prefix}: ${nums}`);
    });
    navigator.clipboard.writeText(lines.join('\n')).then(() => showToast('Lista copiada! ✔'));
}

function copyRepList() {
    const items = document.querySelectorAll('.rep-list-item');
    if (!items.length) { showToast('Nenhuma repetida para copiar.'); return; }
    const lines = [`Repetidas disponíveis - Álbum WC 2026`];
    items.forEach(item => {
        const prefix = item.querySelector('.rep-list-prefix')?.textContent?.trim();
        const num = item.querySelector('.rep-list-num')?.textContent?.trim();
        const qty = parseInt(item.querySelector('.rep-list-qty')?.textContent || '1');
        if (prefix && num) lines.push(`${prefix} ${num}${qty > 1 ? ` ×${qty}` : ''}`);
    });
    navigator.clipboard.writeText(lines.join('\n')).then(() => showToast('Repetidas copiadas! ✔'));
}

function toggleLog() {
    const items = document.getElementById('log-items');
    const chevron = document.getElementById('log-chevron');
    const open = !items.classList.contains('hidden');
    items.classList.toggle('hidden', open);
    if (chevron) chevron.textContent = open ? '▶' : '▼';
}

// Render log on page load
document.addEventListener('DOMContentLoaded', renderLog);

function toggleStickerOwned(el) {
    const country = el.dataset.country;
    const number = parseInt(el.dataset.number);
    fetch('/api/sticker/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, number }),
    })
        .then(r => r.json())
        .then(data => {
            el.classList.toggle('checked', data.owned);
            el.classList.remove('wished');
            if (data.owned) el.classList.remove('wish-mode-on');
            updateCountryCount(el.closest('.country-card'));
            updateGlobalStats();
            logChange(country, number, data.owned);
        })
        .catch(() => showToast('Erro ao salvar.'));
}

function toggleWishlistItem(el) {
    const country = el.dataset.country;
    const number = parseInt(el.dataset.number);
    fetch('/api/wishlist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, number }),
    })
        .then(r => r.json())
        .then(data => {
            el.classList.toggle('wished', data.wished);
            el.classList.toggle('wish-mode-on', !data.wished);
            if (data.wished) {
                addToWishlistSection(country, number, el);
            } else {
                removeFromWishlistSection(country, number);
            }
            showToast(data.wished ? '⭐ Adicionado à lista de desejos!' : 'Removido da lista de desejos.');
        })
        .catch(() => showToast('Erro ao salvar.'));
}

// ── Wishlist remove (called from section ✕ button) ───────────────────────────
function removeWishlist(country, number, _btn) {
    fetch('/api/wishlist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, number }),
    })
        .then(r => r.json())
        .then(data => {
            if (!data.wished) {
                removeFromWishlistSection(country, number);
                // Also unmark the sticker button
                const sel = `.sticker[data-country="${CSS.escape(country)}"][data-number="${number}"]`;
                document.querySelectorAll(sel).forEach(s => s.classList.remove('wished'));
                showToast('Removido da lista de desejos.');
            }
        })
        .catch(() => showToast('Erro ao remover.'));
}

// ── Wishlist section DOM helpers ──────────────────────────────────────────────
function addToWishlistSection(country, number, stickerEl) {
    const body = document.getElementById('wishlist-body');
    if (!body) return;

    let row = body.querySelector(`[data-wishlist-country="${CSS.escape(country)}"]`);
    if (!row) {
        const card = stickerEl?.closest('.country-card');
        const code = card?.dataset.countryCode || '';
        const prefix = card?.dataset.prefix || country.split('(')[0].trim();
        const displayName = country.includes('(') ? country.split('(')[1].replace(')', '').trim() : '';
        let flagHtml = code === 'fwc' ? '<img class="flag-img-sm" src="https://digitalhub.fifa.com/transform/157d23bf-7e13-4d7b-949e-5d27d340987e/WC26_Logo?&io=transform:fill&quality=75" alt="WC26">' : code === 'coca' ? '🥤'
            : `<img class="flag-img-sm" src="https://flagcdn.com/w20/${code}.png" alt="">`;

        row = document.createElement('div');
        row.className = 'wishlist-row';
        row.dataset.wishlistCountry = country;
        row.innerHTML = `<span class="wishlist-country">${flagHtml} <strong>${prefix}</strong> ${displayName}</span><span class="wishlist-nums"></span>`;
        body.appendChild(row);
    }

    const nums = row.querySelector('.wishlist-nums');
    if (nums.querySelector(`[data-number="${number}"]`)) return; // already there

    const chip = document.createElement('span');
    chip.className = 'wish-chip';
    chip.dataset.number = number;
    chip.innerHTML = `${number} <button class="wish-remove" onclick="removeWishlist('${country.replace(/'/g, "\\'")}',${number},this)" title="Remover">✕</button>`;

    const existing = [...nums.querySelectorAll('.wish-chip')];
    const before = existing.find(c => parseInt(c.dataset.number) > number);
    before ? nums.insertBefore(chip, before) : nums.appendChild(chip);

    updateWishlistCount();
}

function removeFromWishlistSection(country, number) {
    const body = document.getElementById('wishlist-body');
    if (!body) return;
    const row = body.querySelector(`[data-wishlist-country="${CSS.escape(country)}"]`);
    if (!row) return;
    row.querySelector(`[data-number="${number}"]`)?.remove();
    if (!row.querySelector('.wish-chip')) row.remove();
    updateWishlistCount();
}

function updateWishlistCount() {
    const body = document.getElementById('wishlist-body');
    if (!body) return;
    const total = body.querySelectorAll('.wish-chip').length;
    const section = body.closest('.wishlist-section-block');
    if (!section) return;
    const countEl = section.querySelector('.match-count');
    if (countEl) countEl.textContent = `(${total} figurinha${total !== 1 ? 's' : ''})`;
    section.style.display = total > 0 ? '' : 'none';
}

// ── Ver mais toggle ───────────────────────────────────────────────────────────
function toggleVerMais(id, btn) {
    const el = document.getElementById(id);
    if (!el) return;
    const isHidden = el.style.display === 'none';
    el.style.display = isHidden ? 'inline' : 'none';
    btn.textContent = isHidden ? 'Ver menos' : btn.dataset.originalText || btn.textContent;
    if (isHidden && !btn.dataset.originalText) btn.dataset.originalText = btn.textContent;
}

// ── Sort & filter ──────────────────────────────────────────────────────────────
let currentView = 'cards';

function sortCurrent(mode) {
    if (currentView === 'trading') sortRepList(mode);
    else sortAlbum(mode);
}

function setMainSortActive(mode) {
    document.querySelectorAll('.sort-btn[data-scope="main"]').forEach(b => b.classList.remove('active'));
    document.querySelector(`.sort-btn[data-scope="main"][data-mode="${mode}"]`)?.classList.add('active');
}

function sortAlbum(mode) {
    const sorter = (a, b) => {
        if (mode === 'alpha')  return (a.dataset.sortName || '').localeCompare(b.dataset.sortName || '', 'pt-BR', { sensitivity: 'base' });
        if (mode === 'prefix') return (a.dataset.prefix  || '').localeCompare(b.dataset.prefix  || '', 'en',    { sensitivity: 'base' });
        return parseInt(a.dataset.index || 0) - parseInt(b.dataset.index || 0);
    };

    const list = document.getElementById('album-list');
    const cards = Array.from(list.querySelectorAll('.country-card'));
    cards.sort(sorter);
    cards.forEach(c => list.appendChild(c));

    const missingList = document.querySelector('#missing-view .missing-list');
    if (missingList) {
        const rows = Array.from(missingList.querySelectorAll('.missing-row'));
        rows.sort(sorter);
        rows.forEach(r => missingList.appendChild(r));
    }

    setMainSortActive(mode);
}

function filterAlbum(query) {
    const q = query.trim().toLowerCase();
    document.getElementById('search-clear').classList.toggle('hidden', !q);
    document.querySelectorAll('.country-card').forEach(card => {
        const name = card.dataset.countryName || '';
        const code = card.dataset.countryCode || '';
        card.classList.toggle('hidden-card', q !== '' && !name.includes(q) && !code.includes(q));
    });
    document.querySelectorAll('.missing-row').forEach(row => {
        const prefix = (row.dataset.prefix || '').toLowerCase();
        const name = (row.dataset.sortName || '').toLowerCase();
        row.classList.toggle('hidden-card', q !== '' && !prefix.includes(q) && !name.includes(q));
    });
}

function clearSearch() {
    const input = document.getElementById('search-input');
    input.value = '';
    filterAlbum('');
    input.focus();
}

// ── View toggle (cards / missing) ──────────────────────────────────────────────
function setView(view) {
    currentView = view;
    const albumList   = document.getElementById('album-list');
    const missingView = document.getElementById('missing-view');
    const tradingView = document.getElementById('rep-list-view');
    const searchBar   = document.querySelector('.search-bar');

    albumList.classList.toggle('hidden',   view !== 'cards');
    missingView?.classList.toggle('hidden', view !== 'missing');
    tradingView?.classList.toggle('hidden', view !== 'trading');
    searchBar?.classList.toggle('hidden',   view === 'trading');

    const qtyBtn = document.querySelector('.sort-btn[data-mode="qty"]');
    if (qtyBtn) qtyBtn.classList.toggle('hidden', view !== 'trading');

    document.querySelectorAll('.sort-btn[data-view]').forEach(b => b.classList.remove('active'));
    document.querySelector(`.sort-btn[data-view="${view}"]`)?.classList.add('active');

    // Reset main sort buttons to appropriate default for this view
    setMainSortActive(view === 'trading' ? 'prefix' : 'album');

    const copyBtn = document.querySelector('.stats-row .copy-btn');
    if (copyBtn) {
        const map = {
            cards:   { fn: copyOwnedList,   title: 'Copiar figurinhas que tenho' },
            missing: { fn: copyMissingList,  title: 'Copiar figurinhas faltantes' },
            trading: { fn: copyRepList,      title: 'Copiar repetidas' },
        };
        const cfg = map[view] || map.cards;
        copyBtn.onclick = cfg.fn;
        copyBtn.title = cfg.title;
    }
}

function addRepetida() {
    const code = document.getElementById('rep-add-country').value.trim().toUpperCase();
    const number = parseInt(document.getElementById('rep-add-number').value);
    const country = COUNTRY_CODES[code];

    if (!country) { showToast('Código desconhecido: ' + code); return; }
    if (isNaN(number) || number < 0) { showToast('Número inválido.'); return; }

    fetch('/api/sticker/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, number, delta: 1 }),
    })
        .then(r => r.json())
        .then(data => {
            // Update existing item in list
            const existing = document.querySelector(
                `.rep-list-item[data-country="${CSS.escape(country)}"][data-number="${number}"]`
            );
            if (existing) {
                existing.querySelector('.rep-list-qty').textContent = data.quantity;
                existing.dataset.qty = data.quantity;
            } else {
                // Build new item from country card data
                const card = document.querySelector(
                    `.country-card[data-country-name="${CSS.escape(country.toLowerCase())}"]`
                );
                const prefix = card?.dataset.prefix || code;
                const sortName = card?.dataset.sortName || '';
                const albumIndex = card?.dataset.index || '999';
                const flagCode = card?.dataset.countryCode || '';
                const flagHtml = flagCode === 'fwc' ? '<img class="flag-img" src="https://digitalhub.fifa.com/transform/157d23bf-7e13-4d7b-949e-5d27d340987e/WC26_Logo?&io=transform:fill&quality=75" alt="WC26">'
                    : flagCode === 'coca' ? '🥤'
                    : `<img class="flag-img" src="https://flagcdn.com/w40/${flagCode}.png" alt="">`;

                const safeCountry = country.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                const item = document.createElement('div');
                item.className = 'rep-list-item';
                Object.assign(item.dataset, { country, number, prefix, sortName, albumIndex, qty: data.quantity });
                item.innerHTML = `
                    <div class="rep-list-flag">${flagHtml}</div>
                    <div class="rep-list-label">
                        <span class="rep-list-prefix">${prefix}</span>
                        <span class="rep-list-num">#${number}</span>
                    </div>
                    <div class="rep-list-controls">
                        <button class="rep-list-btn btn-red" onclick="repListUpdate('${safeCountry}',${number},-1,this)">−</button>
                        <span class="rep-list-qty">${data.quantity}</span>
                        <button class="rep-list-btn btn-green" onclick="repListUpdate('${safeCountry}',${number},1,this)">+</button>
                    </div>`;
                document.getElementById('rep-list-view').appendChild(item);
            }

            // Sync country card rep-grid
            const card = document.querySelector(
                `.country-card[data-country-name="${CSS.escape(country.toLowerCase())}"]`
            );
            if (card) {
                const repItem = card.querySelector(
                    `.rep-item[data-country="${CSS.escape(country)}"][data-number="${number}"]`
                );
                if (repItem) {
                    const qtyEl = repItem.querySelector('.rep-qty');
                    if (qtyEl) qtyEl.textContent = data.quantity;
                    repItem.classList.add('has-stock');
                }
                updateRepCount(card);
            }
            updateGlobalStats();
            showToast(`${code} #${number} → ×${data.quantity}`);
            document.getElementById('rep-add-number').value = '';
            document.getElementById('rep-add-country').focus();
        })
        .catch(() => showToast('Erro ao adicionar.'));
}

function sortRepList(mode) {
    const list = document.getElementById('rep-list-view');
    const items = Array.from(list.querySelectorAll('.rep-list-item'));

    items.sort((a, b) => {
        let diff = 0;
        if (mode === 'album') {
            diff = parseInt(a.dataset.albumIndex) - parseInt(b.dataset.albumIndex);
        } else if (mode === 'alpha') {
            diff = (a.dataset.sortName || '').localeCompare(b.dataset.sortName || '', 'pt-BR', { sensitivity: 'base' });
        } else if (mode === 'qty') {
            diff = parseInt(b.dataset.qty || '0') - parseInt(a.dataset.qty || '0');
        } else {
            diff = (a.dataset.prefix || '').localeCompare(b.dataset.prefix || '', 'en', { sensitivity: 'base' });
        }
        return diff !== 0 ? diff : parseInt(a.dataset.number) - parseInt(b.dataset.number);
    });

    items.forEach(item => list.appendChild(item));
    setMainSortActive(mode);
}

function repListUpdate(country, number, delta, btn) {
    fetch('/api/sticker/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, number, delta }),
    })
        .then(r => r.json())
        .then(data => {
            const item = btn.closest('.rep-list-item');
            const qtyEl = item.querySelector('.rep-list-qty');
            qtyEl.textContent = data.quantity;
            item.dataset.qty = data.quantity;

            if (data.quantity === 0) {
                item.style.transition = 'opacity 0.3s';
                item.style.opacity = '0';
                setTimeout(() => item.remove(), 300);
            }

            // Sync the per-country rep-grid if it's open
            const card = document.querySelector(`.country-card[data-country-name="${CSS.escape(country.toLowerCase())}"]`);
            if (card) {
                const repItem = card.querySelector(`.rep-item[data-country="${CSS.escape(country)}"][data-number="${number}"]`);
                if (repItem) {
                    const cardQty = repItem.querySelector('.rep-qty');
                    if (cardQty) cardQty.textContent = data.quantity;
                    repItem.classList.toggle('has-stock', data.quantity > 0);
                }
                updateRepCount(card);
            }
            updateGlobalStats();
        })
        .catch(() => showToast('Erro ao salvar.'));
}

// ── Country card collapse ──────────────────────────────────────────────────────
function toggleCountry(header) {
    const card = header.closest('.country-card');
    const grid = card.querySelector('.stickers-grid');
    const chevron = header.querySelector('.country-chevron');
    const display = card.querySelector('.country-name-display');
    const isOpen = !grid.classList.contains('hidden');
    grid.classList.toggle('hidden', isOpen);
    card.classList.toggle('open', !isOpen);
    chevron.textContent = isOpen ? '▶' : '▼';
    if (display) {
        if (isOpen) {
            // closing → show abbreviation
            display.textContent = display.dataset.abbr;
        } else {
            // opening → show full name
            const prefix = display.dataset.prefix;
            const code = display.dataset.code;
            display.textContent = '';
            display.appendChild(document.createTextNode(prefix));
            if (code) {
                display.appendChild(document.createTextNode(' '));
                const codeSpan = document.createElement('span');
                codeSpan.className = 'country-name-code';
                codeSpan.textContent = '(' + code + ')';
                display.appendChild(codeSpan);
            }
        }
    }
}

function toggleRepetidas(btn) {
    const card = btn.closest('.country-card');
    const section = card.querySelector('.repetidas-section');
    if (!section) {
        toggleCountry(card.querySelector('.country-header'));
        return;
    }
    section.classList.toggle('hidden');
    btn.classList.toggle('open');
}

// ── Count helpers ──────────────────────────────────────────────────────────────
function updateCountryCount(card) {
    const checked = card.querySelectorAll('.sticker.checked').length;
    const total = card.querySelectorAll('.sticker').length;
    const el = card.querySelector('.country-count');
    if (el) el.textContent = `${checked}/${total}`;
    const fill = card.querySelector('.country-mini-fill');
    if (fill && total > 0) fill.style.width = `${Math.round(checked / total * 100)}%`;
    card.classList.toggle('country-complete', total > 0 && checked === total);
}

function updateRepCount(card) {
    if (!card) return;
    let total = 0;
    card.querySelectorAll('.sticker-rep-qty').forEach(el => { total += parseInt(el.textContent || '0'); });
    const el = card.querySelector('.rep-count');
    if (el) el.textContent = `(${total})`;
}

function clearAllRepetidas() {
    if (!confirm('Remover TODAS as repetidas? Esta ação não pode ser desfeita.')) return;
    fetch('/api/sticker/trade/clear-all', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            if (data.error) { showToast(data.error); return; }
            document.querySelectorAll('.rep-list-item').forEach(el => el.remove());
            document.querySelectorAll('.sticker-rep-qty').forEach(el => { el.textContent = ''; });
            document.querySelectorAll('.sticker-rep-minus').forEach(btn => { btn.disabled = true; });
            document.querySelectorAll('.country-card').forEach(card => updateRepCount(card));
            const header = document.getElementById('rep-list-header');
            if (header) header.textContent = '0 figurinhas para trocar';
            updateGlobalStats();
            showToast('Todas as repetidas removidas.');
        })
        .catch(() => showToast('Erro ao remover.'));
}

function completeCountry(btn) {
    const country = btn.dataset.country;
    const card = btn.closest('.country-card');
    const wasUnowned = [...card.querySelectorAll('.sticker:not(.checked)')].map(s => parseInt(s.dataset.number));

    fetch('/api/country/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country }),
    })
        .then(r => r.json())
        .then(data => {
            if (data.error) { showToast(data.error); return; }
            card.querySelectorAll('.sticker:not(.checked)').forEach(s => {
                s.classList.add('checked');
                s.classList.remove('wished');
                const minus = s.querySelector('.sticker-rep-minus');
                if (minus) minus.disabled = false;
            });
            updateCountryCount(card);
            updateGlobalStats();
            btn.classList.add('hidden');
            showToastWithUndo('País completo! ✓', () => {
                fetch('/api/country/uncomplete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ country, numbers: wasUnowned }),
                })
                    .then(r => r.json())
                    .then(d => {
                        if (d.error) { showToast(d.error); return; }
                        wasUnowned.forEach(num => {
                            const s = card.querySelector(`.sticker[data-number="${num}"]`);
                            if (s) s.classList.remove('checked');
                        });
                        updateCountryCount(card);
                        updateGlobalStats();
                        btn.classList.remove('hidden');
                        showToast('Ação desfeita.');
                    })
                    .catch(() => showToast('Erro ao desfazer.'));
            });
        })
        .catch(() => showToast('Erro ao completar.'));
}

function updateGlobalStats() {
    const owned = document.querySelectorAll('.sticker.checked').length;
    const total = document.querySelectorAll('.sticker').length;
    let tradingTotal = 0;
    document.querySelectorAll('.sticker-rep-qty').forEach(el => { tradingTotal += parseInt(el.textContent || '0'); });

    const pct = total > 0 ? (owned / total * 100).toFixed(1) : '0.0';
    const prob = owned < total ? (1 - Math.pow(owned / total, 7)) * 100 : 0;
    const missing = total - owned;

    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = pct + '%';
    const label = document.getElementById('progress-label');
    if (label) label.textContent = `${owned} de ${total} figurinhas (${pct}%). Faltam ${missing}!`;

    const chips = {
        '.chip-blue': `📘 ${owned}/${total}`,
        '.chip-orange': `🔄 ${tradingTotal}`,
        '.chip-purple': `📦 ${owned + tradingTotal}`,
        '.chip-green': `🎲 ${prob.toFixed(1)}%/pacote`,
    };
    for (const [sel, text] of Object.entries(chips)) {
        const el = document.querySelector(sel);
        if (el) el.textContent = text;
    }
}

// ── Trading stickers ───────────────────────────────────────────────────────────
function updateTrading(country, number, delta, btn) {
    fetch('/api/sticker/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, number, delta }),
    })
        .then(r => r.json())
        .then(data => {
            const sticker = btn.closest('.sticker');
            if (sticker) {
                const qtyEl = sticker.querySelector('.sticker-rep-qty');
                if (qtyEl) qtyEl.textContent = data.quantity || '';
                const minusBtn = sticker.querySelector('.sticker-rep-minus');
                if (minusBtn) minusBtn.disabled = data.quantity === 0;
            }
            updateRepCount(btn.closest('.country-card'));
            updateGlobalStats();
        })
        .catch(() => showToast('Erro ao salvar.'));
}

// ── Trade modal ────────────────────────────────────────────────────────────────
let pendingTrade = {};
let selectedWants = new Set();
let selectedOffers = new Set();
let multiWantMode = false;

function updateSubmitBtn() {
    const btn = document.getElementById('trade-submit-btn');
    const hint = document.getElementById('trade-count-hint');
    if (!btn) return;
    if (!multiWantMode) {
        btn.disabled = false;
        if (hint) hint.textContent = '';
        return;
    }
    const wCount = selectedWants.size;
    const oCount = selectedOffers.size;
    const ok = wCount > 0 && wCount === oCount;
    btn.disabled = !ok;
    if (hint) hint.textContent = ok ? '' : `Quer ${wCount} · Oferece ${oCount} — selecione quantidades iguais`;
}

function openTradeModal(recipientId, country, number, qty, missingKeysOverride, wantList) {
    pendingTrade = { recipientId, wantCountry: country, wantNumber: number };
    selectedWants.clear();
    selectedOffers.clear();
    multiWantMode = !!(wantList && wantList.length > 0);

    const shortName = c => c.includes('(') ? c.split('(')[0].trim() : c;
    const wantLabel = document.getElementById('modal-want-label');
    const wantListEl = document.getElementById('modal-want-list');

    const wantSortControls = document.getElementById('want-sort-controls');
    if (multiWantMode) {
        wantLabel.classList.add('hidden');
        wantListEl.classList.remove('hidden');
        wantListEl.innerHTML = '';
        wantList.forEach(([c, n]) => {
            const key = `${c}|${n}`;
            const div = document.createElement('div');
            div.className = 'want-item';
            div.dataset.prefix = shortName(c);
            div.dataset.number = n;
            div.textContent = `${shortName(c)} #${n}`;
            div.onclick = () => {
                div.classList.toggle('selected');
                if (selectedWants.has(key)) selectedWants.delete(key);
                else selectedWants.add(key);
                updateSubmitBtn();
            };
            wantListEl.appendChild(div);
        });
        wantSortControls?.classList.remove('hidden');
        resetSortBtn(wantSortControls, 'abc');
        sortModalList('modal-want-list', 'abc', null);
    } else {
        wantListEl.classList.add('hidden');
        wantLabel.classList.remove('hidden');
        wantLabel.textContent = `${shortName(country)} #${number}${qty ? ' (disponível: ' + qty + ')' : ''}`;
        selectedWants.add(`${country}|${number}`);
        wantSortControls?.classList.add('hidden');
    }

    document.getElementById('modal-note').value = '';

    const missing = missingKeysOverride instanceof Set ? missingKeysOverride : OWNER_MISSING_KEYS;

    const offerList = document.getElementById('modal-offer-list');
    offerList.innerHTML = '';

    if (!MY_TRADING || MY_TRADING.length === 0) {
        offerList.innerHTML = '<span style="color:var(--text-muted);font-size:13px">Você não tem repetidas registradas para oferecer. Adicione repetidas no seu álbum primeiro.</span>';
    } else {
        MY_TRADING.forEach(item => {
            const key = `${item.country}|${item.number}`;
            const isSuggested = missing.has(key);
            const div = document.createElement('div');
            div.className = 'offer-item' + (isSuggested ? ' suggested' : '');
            div.dataset.key = key;
            div.dataset.prefix = shortName(item.country);
            div.dataset.number = item.number;
            div.dataset.suggested = isSuggested ? '1' : '0';
            div.textContent = `${shortName(item.country)} #${item.number} ×${item.quantity}`;
            div.title = isSuggested ? 'Eles precisam desta!' : '';
            div.onclick = () => {
                div.classList.toggle('selected');
                if (selectedOffers.has(key)) selectedOffers.delete(key);
                else selectedOffers.add(key);
                updateSubmitBtn();
            };
            if (isSuggested) {
                div.classList.add('selected');
                selectedOffers.add(key);
            }
            offerList.appendChild(div);
        });
        const offerSortControls = document.getElementById('offer-sort-controls');
        resetSortBtn(offerSortControls, 'suggested');
        sortModalList('modal-offer-list', 'suggested', null);
    }

    updateSubmitBtn();
    document.getElementById('trade-modal').classList.remove('hidden');
}

function resetSortBtn(controls, mode) {
    if (!controls) return;
    controls.querySelectorAll('.modal-sort-btn').forEach(b => b.classList.remove('active'));
    controls.querySelector(`.modal-sort-btn[data-mode="${mode}"]`)?.classList.add('active');
}

function sortModalList(listId, mode, btn) {
    const container = document.getElementById(listId);
    if (!container) return;
    const items = [...container.querySelectorAll('.want-item, .offer-item')];
    items.sort((a, b) => {
        if (mode === 'num') return parseInt(a.dataset.number || 0) - parseInt(b.dataset.number || 0);
        if (mode === 'suggested') {
            const diff = (b.dataset.suggested === '1' ? 1 : 0) - (a.dataset.suggested === '1' ? 1 : 0);
            return diff !== 0 ? diff : (a.dataset.prefix || '').localeCompare(b.dataset.prefix || '', 'pt-BR', { sensitivity: 'base' });
        }
        return (a.dataset.prefix || '').localeCompare(b.dataset.prefix || '', 'pt-BR', { sensitivity: 'base' });
    });
    items.forEach(el => container.appendChild(el));
    if (btn) {
        btn.closest('.modal-sort-controls').querySelectorAll('.modal-sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
}

function openTradeModalFromBtn(btn) {
    const recipientId = parseInt(btn.dataset.recipient);
    const theyGiveList = JSON.parse(btn.dataset.theygive || '[]');
    const iGiveList = JSON.parse(btn.dataset.igive || '[]');
    const theirMissing = new Set(iGiveList.map(([c, n]) => `${c}|${n}`));
    openTradeModal(recipientId, null, null, null, theirMissing, theyGiveList);
}

function closeTradeModal() {
    document.getElementById('trade-modal').classList.add('hidden');
    selectedWants.clear();
    selectedOffers.clear();
    multiWantMode = false;
}

function submitTrade() {
    const want_items = [];
    if (multiWantMode) {
        selectedWants.forEach(key => {
            const [country, number] = key.split('|');
            want_items.push({ country, number: parseInt(number) });
        });
    } else {
        want_items.push({ country: pendingTrade.wantCountry, number: pendingTrade.wantNumber });
    }
    const offer_items = [];
    selectedOffers.forEach(key => {
        const [country, number] = key.split('|');
        offer_items.push({ country, number: parseInt(number) });
    });

    fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            recipient_id: pendingTrade.recipientId,
            want_items,
            offer_items,
            note: document.getElementById('modal-note').value.trim(),
        }),
    })
        .then(r => r.json())
        .then(data => {
            if (data.error) { showToast(data.error); return; }
            closeTradeModal();
            showToast('Pedido de troca enviado! ✔');
        })
        .catch(() => showToast('Erro ao enviar pedido.'));
}

// ── Bulk entry ─────────────────────────────────────────────────────────────────
let bulkMode = 'album';

function updateBulkMode() {
    bulkMode = document.querySelector('input[name="bulk-mode"]:checked').value;
    document.getElementById('bulk-preview').classList.add('hidden');
}

function openBulkModal() {
    document.getElementById('bulk-modal').classList.remove('hidden');
    document.getElementById('bulk-input').value = '';
    document.getElementById('bulk-preview').classList.add('hidden');
    // Reset to album mode
    document.querySelector('input[name="bulk-mode"][value="album"]').checked = true;
    bulkMode = 'album';
    document.getElementById('bulk-input').focus();
}

function closeBulkModal() {
    document.getElementById('bulk-modal').classList.add('hidden');
}

function parseBulkInput() {
    const text = document.getElementById('bulk-input').value;
    const entries = [];
    const errors = [];

    text.trim().split('\n').forEach((line, i) => {
        const parts = line.trim().toUpperCase().replace(/[,;]/g, ' ').split(/\s+/).filter(Boolean);
        if (!parts.length) return;
        const code = parts[0];
        const country = COUNTRY_CODES[code];
        if (!country) { errors.push(`Linha ${i + 1}: código desconhecido "${code}"`); return; }
        for (let j = 1; j < parts.length; j++) {
            const num = parseInt(parts[j]);
            if (isNaN(num) || num < 1) { errors.push(`Linha ${i + 1}: número inválido "${parts[j]}"`); continue; }
            entries.push({ country, number: num });
        }
    });

    return { entries, errors };
}

function getOwnedKeys() {
    const owned = new Set();
    document.querySelectorAll('.sticker.checked').forEach(el => {
        owned.add(`${el.dataset.country}|${el.dataset.number}`);
    });
    return owned;
}

function previewBulk() {
    const { entries, errors } = parseBulkInput();
    const preview = document.getElementById('bulk-preview');
    preview.classList.remove('hidden');

    let html = '';
    if (errors.length) html += errors.map(e => `<div class="bulk-preview-row bulk-err">⚠ ${e}</div>`).join('');

    if (entries.length) {
        if (bulkMode === 'inverse') {
            const skipByCountry = groupByCountry(entries);
            let totalWillMark = 0;
            Object.entries(skipByCountry).forEach(([country, missingNums]) => {
                const total = getStickerCount(country);
                const willMark = total - missingNums.length;
                totalWillMark += willMark;
                html += `<div class="bulk-preview-row bulk-ok">🔁 ${shortName(country)}: marca ${willMark} (exceto ${missingNums.sort((a,b)=>a-b).join(', ')})</div>`;
            });
            html = `<div class="bulk-preview-row bulk-ok">📘 Total: ~${totalWillMark} figurinhas serão marcadas</div>` + html;
        } else if (bulkMode === 'pack') {
            const owned = getOwnedKeys();
            const toAlbum = entries.filter(e => !owned.has(`${e.country}|${e.number}`));
            const toTrading = entries.filter(e => owned.has(`${e.country}|${e.number}`));
            if (toAlbum.length) {
                html += `<div class="bulk-preview-row bulk-ok">📘 Para o álbum (${toAlbum.length}):</div>`;
                Object.entries(groupByCountry(toAlbum)).forEach(([c, nums]) => {
                    html += `<div class="bulk-preview-row">&nbsp;&nbsp;${shortName(c)}: ${nums.join(', ')}</div>`;
                });
            }
            if (toTrading.length) {
                html += `<div class="bulk-preview-row bulk-trading">🔄 Para repetidas (${toTrading.length}):</div>`;
                Object.entries(groupByCountry(toTrading)).forEach(([c, nums]) => {
                    html += `<div class="bulk-preview-row">&nbsp;&nbsp;${shortName(c)}: ${nums.join(', ')}</div>`;
                });
            }
        } else {
            html += `<div class="bulk-preview-row bulk-ok">📘 ${entries.length} figurinha(s):</div>`;
            Object.entries(groupByCountry(entries)).forEach(([c, nums]) => {
                html += `<div class="bulk-preview-row">&nbsp;&nbsp;${shortName(c)}: ${nums.join(', ')}</div>`;
            });
        }
    }

    if (!entries.length && !errors.length) html = '<div class="bulk-preview-row">Nenhuma figurinha encontrada.</div>';
    preview.innerHTML = html;
}

function groupByCountry(entries) {
    const map = {};
    entries.forEach(e => { (map[e.country] = map[e.country] || []).push(e.number); });
    return map;
}

function shortName(country) {
    return country.includes('(') ? country.split('(')[0].trim() : country;
}

function getStickerCount(country) {
    const card = document.querySelector(`.country-card[data-country-name="${CSS.escape(country.toLowerCase())}"]`);
    return card ? card.querySelectorAll('.sticker').length : 20;
}

function submitBulk() {
    const { entries } = parseBulkInput();
    if (!entries.length) { showToast('Nenhuma figurinha válida encontrada.'); return; }

    fetch('/api/sticker/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries, mode: bulkMode }),
    })
        .then(r => r.json())
        .then(data => {
            closeBulkModal();

            if (bulkMode === 'pack') {
                showToast(`📘 ${data.added_album} no álbum · 🔄 ${data.added_trading} em repetidas!`);
            } else {
                showToast(`📘 ${data.added_album} figurinha(s) marcada(s)!`);
            }

            if (bulkMode === 'inverse') {
                // Mark all stickers per mentioned country EXCEPT the entered ones
                const skipByCountry = groupByCountry(entries);
                Object.entries(skipByCountry).forEach(([country, skipNums]) => {
                    const skipSet = new Set(skipNums);
                    const card = document.querySelector(`.country-card[data-country-name="${CSS.escape(country.toLowerCase())}"]`);
                    if (!card) return;
                    card.querySelectorAll('.sticker').forEach(el => {
                        if (!skipSet.has(parseInt(el.dataset.number)) && !el.classList.contains('checked')) {
                            el.classList.add('checked');
                            el.classList.remove('wished');
                        }
                    });
                    updateCountryCount(card);
                });
            } else {
                // Mark entered stickers as owned
                entries.forEach(({ country, number }) => {
                    const selector = `.sticker[data-country="${CSS.escape(country)}"][data-number="${number}"]`;
                    document.querySelectorAll(selector).forEach(el => {
                        if (!el.classList.contains('checked')) {
                            el.classList.add('checked');
                            el.classList.remove('wished');
                            updateCountryCount(el.closest('.country-card'));
                        }
                    });
                });
            }
            updateGlobalStats();
        })
        .catch(() => showToast('Erro ao salvar.'));
}

// ── Match finder ───────────────────────────────────────────────────────────────
function toggleSection(bodyId, btn) {
    const body = document.getElementById(bodyId);
    const isOpen = !body.classList.contains('hidden');
    body.classList.toggle('hidden', isOpen);
    btn.textContent = btn.textContent.replace(isOpen ? '▼' : '▶', isOpen ? '▶' : '▼');
}

// ── Trade actions ──────────────────────────────────────────────────────────────
function finalizeTrade(tradeId, btn) {
    fetch(`/api/trades/${tradeId}/finalize`, { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            if (data.error) { showToast(data.error); return; }
            if (data.completed) {
                removeTrade(tradeId);
                showToast('Troca concluída! 🎉');
                updateGlobalStats();
            } else {
                btn.disabled = true;
                btn.textContent = '✔ Aguardando outro lado…';
            }
        })
        .catch(() => showToast('Erro. Tente novamente.'));
}

function archiveTrade(tradeId) {
    fetch(`/api/trades/${tradeId}/archive`, { method: 'POST' })
        .then(() => { removeTrade(tradeId); showToast('Troca cancelada.'); })
        .catch(() => showToast('Erro. Tente novamente.'));
}

function removeTrade(tradeId) {
    const el = document.getElementById(`trade-${tradeId}`);
    if (el) { el.style.transition = 'opacity 0.3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }
}

function togglePastTrades() {
    document.getElementById('past-trades-section')?.classList.toggle('hidden');
}

function sortTradeChips(tradeId, mode, btn) {
    const container = document.getElementById(`trade-items-${tradeId}`);
    if (!container) return;
    container.querySelectorAll('.trade-col').forEach(col => {
        const chips = [...col.querySelectorAll('.trade-chip')];
        chips.sort((a, b) =>
            mode === 'num'
                ? parseInt(a.dataset.number || 0) - parseInt(b.dataset.number || 0)
                : (a.dataset.prefix || '').localeCompare(b.dataset.prefix || '', 'pt-BR', { sensitivity: 'base' })
        );
        chips.forEach(c => col.appendChild(c));
    });
    btn.closest('.trade-chip-sort').querySelectorAll('.modal-sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function sortTrades(list, mode, btn) {
    const listId = { incoming: 'incoming-list', outgoing: 'outgoing-list', past: 'past-list' }[list];
    const container = document.getElementById(listId);
    if (!container) return;

    const cards = [...container.querySelectorAll('.trade-card')];
    cards.sort((a, b) => {
        if (mode === 'date-desc') return b.dataset.date.localeCompare(a.dataset.date);
        if (mode === 'date-asc')  return a.dataset.date.localeCompare(b.dataset.date);
        if (mode === 'name')      return (a.dataset.name || '').localeCompare(b.dataset.name || '', 'pt-BR', { sensitivity: 'base' });
        if (mode === 'status')    return (a.dataset.status || '').localeCompare(b.dataset.status || '');
        return 0;
    });
    cards.forEach(c => container.appendChild(c));

    document.querySelectorAll(`.sort-btn[data-list="${list}"]`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// ── Feedback modal ─────────────────────────────────────────────────────────────
function openFeedbackModal() {
    const ta = document.getElementById('feedback-text');
    if (ta) { ta.value = ''; updateFeedbackCount(); }
    document.getElementById('feedback-modal')?.classList.remove('hidden');
}

function closeFeedbackModal() {
    document.getElementById('feedback-modal')?.classList.add('hidden');
}

function updateFeedbackCount() {
    const ta = document.getElementById('feedback-text');
    const n = document.getElementById('feedback-char-n');
    if (ta && n) n.textContent = ta.value.length;
}

function submitFeedback() {
    const msg = document.getElementById('feedback-text')?.value.trim();
    if (!msg) { showToast('Escreva algo antes de enviar.'); return; }
    fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
    })
        .then(r => r.json())
        .then(data => {
            if (data.error) { showToast(data.error); return; }
            closeFeedbackModal();
            showToast('Feedback enviado! Obrigado 🙏');
        })
        .catch(() => showToast('Erro ao enviar. Tente novamente.'));
}

// ── Trade message ──────────────────────────────────────────────────────────────
function openTradeMsgModal() {
    const sn = c => c.includes('(') ? c.split('(')[0].trim() : c;

    // Group MY_TRADING by country
    const repGrouped = {};
    (MY_TRADING || []).forEach(item => {
        if (!repGrouped[item.country]) repGrouped[item.country] = [];
        repGrouped[item.country].push({ number: item.number, qty: item.quantity });
    });

    // Build "Preciso" from unowned stickers in the DOM
    const needGrouped = {};
    document.querySelectorAll('.sticker:not(.checked)').forEach(s => {
        const country = s.dataset.country;
        const num = parseInt(s.dataset.number);
        if (!country || isNaN(num)) return;
        if (!needGrouped[country]) needGrouped[country] = [];
        needGrouped[country].push(num);
    });

    function renderSection(containerId, grouped, labelFn) {
        const el = document.getElementById(containerId);
        el.innerHTML = '';
        const countries = Object.keys(grouped).sort((a, b) => sn(a).localeCompare(sn(b), 'pt-BR', { sensitivity: 'base' }));
        if (!countries.length) {
            el.innerHTML = '<span class="trade-msg-empty">Nenhum item.</span>';
            return;
        }
        countries.forEach(country => {
            const items = grouped[country].slice().sort((a, b) => (a.number ?? a) - (b.number ?? b));
            const group = document.createElement('div');
            group.className = 'trade-msg-group';
            const hdr = document.createElement('div');
            hdr.className = 'trade-msg-group-hdr';
            hdr.innerHTML = `<span class="trade-msg-group-name">${sn(country)}</span>
                <button class="trade-msg-tog" onclick="tradeMsgToggleCountry(this)">✓</button>`;
            group.appendChild(hdr);
            const chips = document.createElement('div');
            chips.className = 'trade-msg-chips';
            items.forEach(item => {
                const num = item.number ?? item;
                const qty = item.qty ?? 1;
                const chip = document.createElement('span');
                chip.className = 'trade-msg-chip selected';
                chip.dataset.key = `${country}|${num}`;
                chip.dataset.qty = qty;
                chip.textContent = labelFn(num, qty);
                chip.onclick = () => chip.classList.toggle('selected');
                chips.appendChild(chip);
            });
            group.appendChild(chips);
            el.appendChild(group);
        });
    }

    renderSection('trade-msg-rep-list',  repGrouped,  (n, q) => q > 1 ? `#${n} ×${q}` : `#${n}`);
    renderSection('trade-msg-need-list', needGrouped, (n)    => `#${n}`);

    document.getElementById('trade-msg-output').value = '';
    document.getElementById('trade-msg-modal').classList.remove('hidden');
}

function closeTradeMsgModal() {
    document.getElementById('trade-msg-modal').classList.add('hidden');
}

function tradeMsgSelectAll(section) {
    const id = section === 'rep' ? 'trade-msg-rep-list' : 'trade-msg-need-list';
    document.querySelectorAll(`#${id} .trade-msg-chip`).forEach(c => c.classList.add('selected'));
}

function tradeMsgSelectNone(section) {
    const id = section === 'rep' ? 'trade-msg-rep-list' : 'trade-msg-need-list';
    document.querySelectorAll(`#${id} .trade-msg-chip`).forEach(c => c.classList.remove('selected'));
}

function tradeMsgToggleCountry(btn) {
    const chips = btn.closest('.trade-msg-group').querySelectorAll('.trade-msg-chip');
    const allSelected = [...chips].every(c => c.classList.contains('selected'));
    chips.forEach(c => c.classList.toggle('selected', !allSelected));
}

function generateTradeMsg() {
    const sn = c => c.includes('(') ? c.split('(')[0].trim() : c;

    function collect(listId, withQty) {
        const grouped = {};
        document.querySelectorAll(`#${listId} .trade-msg-chip.selected`).forEach(chip => {
            const idx = chip.dataset.key.lastIndexOf('|');
            const country = chip.dataset.key.substring(0, idx);
            const num = parseInt(chip.dataset.key.substring(idx + 1));
            const qty = parseInt(chip.dataset.qty || '1');
            if (!grouped[country]) grouped[country] = [];
            grouped[country].push({ num, qty });
        });
        return grouped;
    }

    const rep  = collect('trade-msg-rep-list',  true);
    const need = collect('trade-msg-need-list', false);

    if (!Object.keys(rep).length && !Object.keys(need).length) {
        showToast('Selecione pelo menos um item.');
        return;
    }

    const lines = ['🔄 *Troca de figurinhas - Copa do Mundo 2026*', ''];

    if (Object.keys(rep).length) {
        lines.push('📦 *Tenho para trocar:*');
        Object.entries(rep).sort(([a],[b]) => sn(a).localeCompare(sn(b), 'pt-BR', { sensitivity: 'base' }))
            .forEach(([country, items]) => {
                const nums = items.sort((a,b)=>a.num-b.num)
                    .map(i => i.qty > 1 ? `#${i.num} (×${i.qty})` : `#${i.num}`).join(', ');
                lines.push(`• ${sn(country)}: ${nums}`);
            });
        lines.push('');
    }

    if (Object.keys(need).length) {
        lines.push('🔍 *Preciso:*');
        Object.entries(need).sort(([a],[b]) => sn(a).localeCompare(sn(b), 'pt-BR', { sensitivity: 'base' }))
            .forEach(([country, items]) => {
                const nums = items.sort((a,b)=>a.num-b.num).map(i => `#${i.num}`).join(', ');
                lines.push(`• ${sn(country)}: ${nums}`);
            });
        lines.push('');
    }

    lines.push('📲 Me chame para combinarmos! 😊');
    document.getElementById('trade-msg-output').value = lines.join('\n');
}

function copyTradeMsg() {
    const text = document.getElementById('trade-msg-output').value;
    if (!text) { showToast('Gere a mensagem primeiro.'); return; }
    navigator.clipboard.writeText(text).then(() => showToast('Mensagem copiada! ✔'));
}

// ── WebSocket ──────────────────────────────────────────────────────────────────
(function connectWS() {
    if (typeof CURRENT_USER_ID === 'undefined') return;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws/${CURRENT_USER_ID}`);
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'trade_request') {
            showToast(data.message);
        } else if (data.type === 'trade_finalized') {
            if (data.completed) {
                showToast(`Troca concluída com ${data.by_user}! 🎉`);
                removeTrade(data.trade_id);
            } else {
                showToast(`${data.by_user} finalizou a troca. Confirme sua parte!`);
            }
        }
    };
    ws.onclose = () => setTimeout(connectWS, 3000);
})();

// ── Toast ──────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
    const el = document.getElementById('toast');
    const msgEl = document.getElementById('toast-msg');
    const undoBtn = document.getElementById('toast-undo');
    if (msgEl) msgEl.textContent = msg; else el.textContent = msg;
    if (undoBtn) undoBtn.classList.add('hidden');
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

function showToastWithUndo(msg, undoFn, duration = 6000) {
    const el = document.getElementById('toast');
    const msgEl = document.getElementById('toast-msg');
    const undoBtn = document.getElementById('toast-undo');
    if (msgEl) msgEl.textContent = msg;
    if (undoBtn) {
        undoBtn.classList.remove('hidden');
        undoBtn.onclick = () => {
            clearTimeout(toastTimer);
            el.classList.add('hidden');
            undoBtn.classList.add('hidden');
            undoFn();
        };
    }
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        el.classList.add('hidden');
        if (undoBtn) undoBtn.classList.add('hidden');
    }, duration);
}

