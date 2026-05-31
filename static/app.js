// ── Announcement notification ─────────────────────────────────────────────────
const ANNOUNCE_KEY = 'announce_v2_dismissed';
(function initAnnouncement() {
    if (localStorage.getItem(ANNOUNCE_KEY)) return;
    const list = document.getElementById('notif-list');
    if (!list) return;
    list.querySelector('.notif-empty')?.remove();
    const el = document.createElement('div');
    el.className = 'notif-announce';
    el.id = 'notif-announce-item';
    el.innerHTML = `
        <button class="notif-dismiss" onclick="dismissAnnouncement()">✕</button>
        🆕 <strong>Novidades:</strong><br>
        · Edite seu <a href="/profile">perfil</a> (nome, foto, senha)<br>
        · <strong>Matches de Troca</strong> agora mostram só quem tem o que você precisa
    `;
    list.prepend(el);
    const badge = document.getElementById('notif-badge');
    if (badge) { badge.classList.remove('hidden'); badge.textContent = parseInt(badge.textContent || '0') + 1; }
})();

function dismissAnnouncement() {
    localStorage.setItem(ANNOUNCE_KEY, '1');
    const el = document.getElementById('notif-announce-item');
    if (el) { el.remove(); }
    const badge = document.getElementById('notif-badge');
    if (badge) {
        const n = Math.max(0, parseInt(badge.textContent || '1') - 1);
        badge.textContent = n;
        if (n === 0) badge.classList.add('hidden');
    }
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
            if (data.wished) {
                addToWishlistSection(country, number, el);
            } else {
                removeFromWishlistSection(country, number);
            }
            showToast(data.wished ? '⭐ Adicionado à lista de desejos!' : 'Removido da lista de desejos.');
        })
        .catch(() => showToast('Erro ao salvar.'));
}

// ── Auto-edit mode on load ────────────────────────────────────────────────────
if (typeof AUTO_EDIT !== 'undefined' && AUTO_EDIT && IS_OWN_ALBUM) {
    document.addEventListener('DOMContentLoaded', () => toggleEditMode());
}

// ── Wishlist remove (called from section ✕ button) ───────────────────────────
function removeWishlist(country, number, btn) {
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
        let flagHtml = code === 'fwc' ? '🏆' : code === 'coca' ? '🥤'
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
    const albumList   = document.getElementById('album-list');
    const missingView = document.getElementById('missing-view');
    const tradingView = document.getElementById('rep-list-view');
    const searchBar   = document.querySelector('.search-bar');

    albumList.classList.toggle('hidden',   view !== 'cards');
    missingView?.classList.toggle('hidden', view !== 'missing');
    tradingView?.classList.toggle('hidden', view !== 'trading');
    searchBar?.classList.toggle('hidden',   view !== 'cards');

    document.querySelectorAll('.sort-btn[data-view]').forEach(b => b.classList.remove('active'));
    document.querySelector(`.sort-btn[data-view="${view}"]`)?.classList.add('active');
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
            } else {
                // Build new item from country card data
                const card = document.querySelector(
                    `.country-card[data-country-name="${CSS.escape(country.toLowerCase())}"]`
                );
                const prefix = card?.dataset.prefix || code;
                const sortName = card?.dataset.sortName || '';
                const albumIndex = card?.dataset.index || '999';
                const flagCode = card?.dataset.countryCode || '';
                const flagHtml = flagCode === 'fwc' ? '🏆'
                    : flagCode === 'coca' ? '🥤'
                    : `<img class="flag-img" src="https://flagcdn.com/w40/${flagCode}.png" alt="">`;

                const safeCountry = country.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                const item = document.createElement('div');
                item.className = 'rep-list-item';
                Object.assign(item.dataset, { country, number, prefix, sortName, albumIndex });
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
        } else {
            diff = (a.dataset.prefix || '').localeCompare(b.dataset.prefix || '', 'en', { sensitivity: 'base' });
        }
        return diff !== 0 ? diff : parseInt(a.dataset.number) - parseInt(b.dataset.number);
    });

    items.forEach(item => list.appendChild(item));
    document.querySelectorAll('.rep-sort-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.rep-sort-btn[data-mode="${mode}"]`)?.classList.add('active');
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
