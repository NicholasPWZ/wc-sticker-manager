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

// ── Edit / Wishlist modes ──────────────────────────────────────────────────────
let editMode = false;
let wishMode = false;

function toggleEditMode() {
    editMode = !editMode;
    if (editMode && wishMode) toggleWishlistMode(); // mutually exclusive
    const btn = document.getElementById('edit-btn');
    if (btn) { btn.classList.toggle('active', editMode); btn.textContent = editMode ? '🔒 Parar' : '✏️ Editar'; }
    const sideBtn = document.getElementById('sidebar-edit-btn');
    if (sideBtn) { sideBtn.classList.toggle('active', editMode); sideBtn.textContent = editMode ? '🔒 Parar Edição' : '✏️ Editar Álbum'; }
    document.querySelectorAll('.sticker').forEach(s => {
        s.classList.toggle('editable', editMode);
        s.classList.remove('wish-mode-on');
    });
}

function toggleWishlistMode() {
    wishMode = !wishMode;
    if (wishMode && editMode) toggleEditMode();
    const btn = document.getElementById('wish-btn');
    if (btn) { btn.classList.toggle('active', wishMode); btn.textContent = wishMode ? '⭐ Sair' : '⭐ Desejos'; }
    const sideBtn = document.getElementById('sidebar-wish-btn');
    if (sideBtn) { sideBtn.classList.toggle('active', wishMode); sideBtn.textContent = wishMode ? '⭐ Sair Desejos' : '⭐ Lista de Desejos'; }
    document.querySelectorAll('.sticker').forEach(s => {
        s.classList.remove('editable');
        s.classList.toggle('wish-mode-on', wishMode && !s.classList.contains('checked'));
    });
}

function handleStickerClick(el) {
    if (!IS_OWN_ALBUM) return;

    if (wishMode && !el.classList.contains('checked')) {
        toggleWishlistItem(el);
        return;
    }
    if (!editMode) return;
    toggleStickerOwned(el);
}

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
            showToast(data.wished ? '⭐ Adicionado à lista de desejos!' : 'Removido da lista de desejos.');
        })
        .catch(() => showToast('Erro ao salvar.'));
}

// ── Sort & filter ──────────────────────────────────────────────────────────────
function sortAlbum(mode) {
    const list = document.getElementById('album-list');
    const cards = Array.from(list.querySelectorAll('.country-card'));
    if (mode === 'alpha') {
        cards.sort((a, b) =>
            a.dataset.sortName.localeCompare(b.dataset.sortName, 'pt-BR', { sensitivity: 'base' })
        );
    } else if (mode === 'prefix') {
        cards.sort((a, b) =>
            (a.dataset.prefix || '').localeCompare(b.dataset.prefix || '', 'en', { sensitivity: 'base' })
        );
    } else {
        cards.sort((a, b) => parseInt(a.dataset.index) - parseInt(b.dataset.index));
    }
    cards.forEach(c => list.appendChild(c));
    document.querySelectorAll('.sort-btn[data-mode]').forEach(b => b.classList.remove('active'));
    document.querySelector(`.sort-btn[data-mode="${mode}"]`)?.classList.add('active');
}

function filterAlbum(query) {
    const q = query.trim().toLowerCase();
    document.getElementById('search-clear').classList.toggle('hidden', !q);
    document.querySelectorAll('.country-card').forEach(card => {
        const name = card.dataset.countryName || '';
        const code = card.dataset.countryCode || '';
        card.classList.toggle('hidden-card', q !== '' && !name.includes(q) && !code.includes(q));
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
    const albumList = document.getElementById('album-list');
    const missingView = document.getElementById('missing-view');
    const searchBar = document.querySelector('.search-bar');

    if (view === 'missing') {
        albumList.classList.add('hidden');
        if (missingView) missingView.classList.remove('hidden');
        if (searchBar) searchBar.classList.add('hidden');
    } else {
        albumList.classList.remove('hidden');
        if (missingView) missingView.classList.add('hidden');
        if (searchBar) searchBar.classList.remove('hidden');
    }

    document.querySelectorAll('.sort-btn[data-view]').forEach(b => b.classList.remove('active'));
    document.querySelector(`.sort-btn[data-view="${view}"]`)?.classList.add('active');
}

// ── Country card collapse ──────────────────────────────────────────────────────
function toggleCountry(header) {
    const card = header.closest('.country-card');
    const grid = card.querySelector('.stickers-grid');
    const chevron = header.querySelector('.country-chevron');
    const isOpen = !grid.classList.contains('hidden');
    grid.classList.toggle('hidden', isOpen);
    chevron.textContent = isOpen ? '▶' : '▼';
}

function toggleRepetidas(btn) {
    const card = btn.closest('.country-card');
    const section = card.querySelector('.repetidas-section');
    section.classList.toggle('hidden');
    btn.classList.toggle('open');
}

// ── Count helpers ──────────────────────────────────────────────────────────────
function updateCountryCount(card) {
    const checked = card.querySelectorAll('.sticker.checked').length;
    const total = card.querySelectorAll('.sticker').length;
    const el = card.querySelector('.country-count');
    if (el) el.textContent = `${checked}/${total}`;
}

function updateRepCount(card) {
    let total = 0;
    card.querySelectorAll('.rep-qty').forEach(el => { total += parseInt(el.textContent || '0'); });
    const el = card.querySelector('.rep-count');
    if (el) el.textContent = `(${total})`;
}

function updateGlobalStats() {
    const owned = document.querySelectorAll('.sticker.checked').length;
    const total = document.querySelectorAll('.sticker').length;
    let tradingTotal = 0;
    document.querySelectorAll('.rep-qty').forEach(el => { tradingTotal += parseInt(el.textContent || '0'); });

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
            const repItem = btn.closest('.rep-item');
            const qtyEl = repItem.querySelector('.rep-qty');
            qtyEl.textContent = data.quantity;
            repItem.classList.toggle('has-stock', data.quantity > 0);
            updateRepCount(repItem.closest('.country-card'));
            updateGlobalStats();
        })
        .catch(() => showToast('Erro ao salvar.'));
}

// ── Trade modal ────────────────────────────────────────────────────────────────
let pendingTrade = {};
let selectedOffers = new Set();

function openTradeModal(recipientId, country, number, qty) {
    pendingTrade = { recipientId, wantCountry: country, wantNumber: number };
    selectedOffers.clear();

    document.getElementById('modal-want-label').textContent = `${country} #${number} (disponível: ${qty})`;
    document.getElementById('modal-note').value = '';

    const offerList = document.getElementById('modal-offer-list');
    offerList.innerHTML = '';

    if (!MY_TRADING || MY_TRADING.length === 0) {
        offerList.innerHTML = '<span style="color:var(--text-muted);font-size:13px">Você não tem repetidas para oferecer.</span>';
    } else {
        MY_TRADING.forEach(item => {
            const key = `${item.country}|${item.number}`;
            const isSuggested = OWNER_MISSING_KEYS.has(key);
            const div = document.createElement('div');
            div.className = 'offer-item' + (isSuggested ? ' suggested' : '');
            div.dataset.key = key;
            div.textContent = `${item.country.split('(')[0]?.trim() || item.country} #${item.number} ×${item.quantity}`;
            div.title = isSuggested ? 'Eles precisam desta!' : '';
            div.onclick = () => {
                div.classList.toggle('selected');
                if (selectedOffers.has(key)) selectedOffers.delete(key);
                else selectedOffers.add(key);
            };
            // Auto-select items they need
            if (isSuggested) {
                div.classList.add('selected');
                selectedOffers.add(key);
            }
            offerList.appendChild(div);
        });
    }

    document.getElementById('trade-modal').classList.remove('hidden');
}

function closeTradeModal() {
    document.getElementById('trade-modal').classList.add('hidden');
    selectedOffers.clear();
}

function submitTrade() {
    const want_items = [{ country: pendingTrade.wantCountry, number: pendingTrade.wantNumber }];
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
        if (bulkMode === 'pack') {
            const owned = getOwnedKeys();
            const toAlbum = entries.filter(e => !owned.has(`${e.country}|${e.number}`));
            const toTrading = entries.filter(e => owned.has(`${e.country}|${e.number}`));

            if (toAlbum.length) {
                html += `<div class="bulk-preview-row bulk-ok">📘 Para o álbum (${toAlbum.length}):</div>`;
                const byC = groupByCountry(toAlbum);
                Object.entries(byC).forEach(([c, nums]) => {
                    html += `<div class="bulk-preview-row">&nbsp;&nbsp;${shortName(c)}: ${nums.join(', ')}</div>`;
                });
            }
            if (toTrading.length) {
                html += `<div class="bulk-preview-row bulk-trading">🔄 Para repetidas (${toTrading.length}):</div>`;
                const byC = groupByCountry(toTrading);
                Object.entries(byC).forEach(([c, nums]) => {
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

function submitBulk() {
    const { entries, errors } = parseBulkInput();
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

            // Update album UI for newly owned stickers
            entries.forEach(({ country, number }) => {
                const key = `${country}|${number}`;
                const selector = `.sticker[data-country="${CSS.escape(country)}"][data-number="${number}"]`;
                const owned = getOwnedKeys().has(key);
                if (!owned) {
                    document.querySelectorAll(selector).forEach(el => {
                        el.classList.add('checked');
                        el.classList.remove('wished');
                        updateCountryCount(el.closest('.country-card'));
                    });
                }
            });
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

// ── Notifications ──────────────────────────────────────────────────────────────
function toggleNotifPanel() {
    document.getElementById('notif-panel').classList.toggle('hidden');
}

function addNotification(message) {
    const list = document.getElementById('notif-list');
    list.querySelector('.notif-empty')?.remove();
    const item = document.createElement('div');
    item.className = 'notif-item';
    item.textContent = message;
    list.prepend(item);
    const badge = document.getElementById('notif-badge');
    badge.classList.remove('hidden');
    badge.textContent = parseInt(badge.textContent || '0') + 1;
}

// ── WebSocket ──────────────────────────────────────────────────────────────────
(function connectWS() {
    if (typeof CURRENT_USER_ID === 'undefined') return;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws/${CURRENT_USER_ID}`);
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'trade_request') {
            addNotification(`${data.from_user} quer trocar com você!`);
            showToast(data.message);
        } else if (data.type === 'trade_finalized') {
            if (data.completed) {
                showToast(`Troca concluída com ${data.by_user}! 🎉`);
                removeTrade(data.trade_id);
            } else {
                addNotification(`${data.by_user} confirmou a troca. Confirme sua parte!`);
                showToast(`${data.by_user} finalizou a troca. Sua vez!`);
            }
        }
    };
    ws.onclose = () => setTimeout(connectWS, 3000);
})();

// ── Toast ──────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

// Close notif panel on outside click
document.addEventListener('click', e => {
    const panel = document.getElementById('notif-panel');
    const btn = document.getElementById('notif-btn');
    if (panel && !panel.classList.contains('hidden') && !panel.contains(e.target) && btn && !btn.contains(e.target))
        panel.classList.add('hidden');
});
