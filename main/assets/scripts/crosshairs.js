
let allCrosshairs = [];
let currentFilter = 'all';
let currentSearch = '';
let currentCrosshairPage = 1;
let crosshairsLoadPromise = null;
let crosshairObserver = null;
const customCrosshairKey = 'linedup_crosshairs';
const CROSSHAIRS_API_URL = '/crosshairs';
const CROSSHAIRS_PER_PAGE = 16;

let lastRenderedCrosshairs = [];
let currentDetailId = null;

async function loadCrosshairs() {
    if (!document.getElementById('crosshairs-grid')) return Promise.resolve();
    if (!crosshairsLoadPromise) {
        crosshairsLoadPromise = (async () => {
            try {
                const res = await fetch(CROSSHAIRS_API_URL);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                allCrosshairs = await res.json();
            } catch {
                try {
                    const res = await fetch('data/crosshairs.json');
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    allCrosshairs = await res.json();
                } catch {
                    allCrosshairs = getCustomCrosshairs();
                }
            }
        })();
    }
    await crosshairsLoadPromise;
    if (location.hash === '#favorites') currentFilter = 'favorites';
    renderCrosshairs();
}

function getCustomCrosshairs() {
    const migrated = localStorage.getItem(customCrosshairKey);
    if (migrated) return JSON.parse(migrated || '[]');
    const legacy = JSON.parse(localStorage.getItem('valtrack_crosshairs') || '[]');
    if (legacy.length) localStorage.setItem(customCrosshairKey, JSON.stringify(legacy));
    return legacy;
}

function filterCrosshairs(category, btn) {
    if (category === 'favorites' && !window.LinedUpAuth?.requireLogin?.('Entre com uma conta para ver suas miras favoritas.')) return;

    currentFilter = category;
    currentCrosshairPage = 1;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn?.classList.add('active');
    if (category === 'favorites') history.replaceState(history.state, '', 'index.html#favorites');
    else if (location.hash === '#favorites') history.replaceState(history.state, '', 'index.html');
    renderCrosshairs();
}

function searchCrosshairs(value) {
    currentSearch = String(value || '').trim().toLowerCase();
    currentCrosshairPage = 1;
    renderCrosshairs();
}

function isCrosshairAdmin() {
    return window.LinedUpAuth?.getCurrentUser?.()?.type === 'admin';
}

function getFilteredCrosshairs() {
    const favorites = favoriteIds();
    const byCategory = currentFilter === 'favorites'
        ? allCrosshairs.filter(c => favorites.has(Number(c.id)))
        : currentFilter === 'all'
            ? allCrosshairs
            : allCrosshairs.filter(c => c.category === currentFilter);
    return currentSearch
        ? byCategory.filter(c => `${c.name || ''} ${c.description || ''} ${c.category || ''} ${c.code || ''}`.toLowerCase().includes(currentSearch))
        : byCategory;
}

function isFavoriteCrosshair(id) {
    const user = window.LinedUpAuth?.getCurrentUser?.();
    return Boolean(user?.favoriteCrosshairIds?.map(Number).includes(Number(id)));
}

function favoriteIds() {
    return new Set((window.LinedUpAuth?.getCurrentUser?.()?.favoriteCrosshairIds || []).map(Number));
}

function renderCrosshairs() {
    const grid = document.getElementById('crosshairs-grid');
    if (!grid) return;
    if (crosshairObserver) crosshairObserver.disconnect();

    const filtered = getFilteredCrosshairs();
    const totalPages = Math.max(1, Math.ceil(filtered.length / CROSSHAIRS_PER_PAGE));
    currentCrosshairPage = Math.min(Math.max(1, currentCrosshairPage), totalPages);
    const pageStart = (currentCrosshairPage - 1) * CROSSHAIRS_PER_PAGE;
    const pageItems = filtered.slice(pageStart, pageStart + CROSSHAIRS_PER_PAGE);

    document.querySelectorAll('.filter-btn').forEach(button => {
        const text = button.textContent.trim().toLowerCase();
        const labelMap = {
            all: 'todas',
            Pro: 'pro players',
            Community: 'comunidade',
            Default: 'padrão',
            favorites: 'favoritas'
        };
        const isActive = text === labelMap[currentFilter];
        button.classList.toggle('active', isActive);
    });

    if (!filtered.length) {
        grid.innerHTML = currentFilter === 'favorites'
            ? '<div class="state-box"><p>Nenhuma mira favorita ainda.</p></div>'
            : '<div class="state-box"><p>Nenhuma mira nessa categoria ainda.</p></div>';
        renderCrosshairPagination(0, 1);
        return;
    }

    lastRenderedCrosshairs = filtered;

    const user = window.LinedUpAuth?.getCurrentUser?.();
    grid.innerHTML = pageItems.map(cx => `
    <div class="crosshair-card" onclick="openCrosshairDetail(${Number(cx.id)})">
      <div class="crosshair-card-top">
        ${user ? `<button class="favorite-btn${isFavoriteCrosshair(cx.id) ? ' active' : ''}" type="button"
          onclick="toggleCrosshairFavorite(event, ${Number(cx.id)})"
          title="${isFavoriteCrosshair(cx.id) ? 'Remover dos favoritos' : 'Marcar como favorito'}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="${isFavoriteCrosshair(cx.id) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>
          </svg>
        </button>` : '<span></span>'}
        <span class="crosshair-badge badge-${escapeHtml(cx.category)}">${escapeHtml(cx.category)}</span>
      </div>
      <div class="crosshair-preview crosshair-preview-bg">
        <canvas id="cx-card-${cx.id}" width="120" height="120" data-code="${escapeHtml(cx.code)}"></canvas>
      </div>
      <div class="crosshair-info">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <div class="crosshair-info-name">${escapeHtml(cx.name)}</div>
        </div>
        <div class="crosshair-info-desc">${escapeHtml(cx.description || '')}</div>
      </div>
      <div class="crosshair-code-wrap">
        <div class="crosshair-code" title="${escapeHtml(cx.code)}">${escapeHtml(cx.code)}</div>
        <button class="copy-btn" onclick="event.stopPropagation(); copyCrosshairCode('${escapeJsString(cx.code)}')" title="Copiar código">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');

    renderCrosshairPagination(filtered.length, totalPages);
    requestAnimationFrame(() => drawVisibleCrosshairs(pageItems));
}

function renderCrosshairPagination(totalItems, totalPages) {
    const pagination = document.getElementById('crosshair-pagination');
    if (!pagination) return;
    if (totalItems <= CROSSHAIRS_PER_PAGE) {
        pagination.innerHTML = '';
        pagination.hidden = true;
        return;
    }

    pagination.hidden = false;
    const buttons = Array.from({ length: totalPages }, (_, index) => {
        const page = index + 1;
        return `
            <button class="crosshair-page-btn${page === currentCrosshairPage ? ' active' : ''}"
                type="button" onclick="setCrosshairPage(${page})">${page}</button>
        `;
    }).join('');

    pagination.innerHTML = `
        <button class="crosshair-page-btn" type="button" onclick="setCrosshairPage(${currentCrosshairPage - 1})"
            aria-label="Pagina anterior" ${currentCrosshairPage <= 1 ? 'disabled' : ''}>&lt;</button>
        ${buttons}
        <button class="crosshair-page-btn" type="button" onclick="setCrosshairPage(${currentCrosshairPage + 1})"
            aria-label="Proxima pagina" ${currentCrosshairPage >= totalPages ? 'disabled' : ''}>&gt;</button>
    `;
}

function setCrosshairPage(page) {
    currentCrosshairPage = Number(page) || 1;
    renderCrosshairs();
    document.getElementById('crosshair-filters')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function toggleCrosshairFavorite(event, crosshairId) {
    event?.stopPropagation();
    const user = window.LinedUpAuth?.getCurrentUser?.();
    if (!user) {
        showToast('Faça login para favoritar miras.');
        window.LinedUpAuth?.openLogin?.();
        return;
    }

    const active = isFavoriteCrosshair(crosshairId);
    try {
        await window.LinedUpAuth.updateFavorite(crosshairId, !active);
        renderCrosshairs();
        showToast(active ? 'Mira removida dos favoritos.' : 'Mira adicionada aos favoritos.');
    } catch (error) {
        showToast(error.message || 'Erro ao atualizar favorito.');
    }
}

function escapeJsString(value) {
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function drawVisibleCrosshairs(crosshairs) {
    const byId = new Map(crosshairs.map(cx => [`cx-card-${cx.id}`, cx]));
    const canvases = [...document.querySelectorAll('#crosshairs-grid canvas')];

    const drawOne = canvas => {
        if (!canvas || canvas.dataset.drawn === 'true') return;
        const cx = byId.get(canvas.id);
        if (!cx) return;
        drawCrosshair(canvas, parseCrosshairCode(cx.code, cx));
        canvas.dataset.drawn = 'true';
    };

    if (!('IntersectionObserver' in window)) {
        canvases.forEach(drawOne);
        return;
    }

    crosshairObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            drawOne(entry.target);
            crosshairObserver.unobserve(entry.target);
        });
    }, { rootMargin: '220px' });

    canvases.forEach(canvas => crosshairObserver.observe(canvas));
}

function copyCrosshairCode(code) {
    if (!window.LinedUpAuth?.requireLogin?.('Entre com uma conta para copiar codigos de mira.')) return;

    navigator.clipboard.writeText(code).then(() => {
        showToast('Código copiado! Cole em Settings → Crosshair → Import Profile Code');
    }).catch(() => {
        showToast('Não foi possível copiar automaticamente. Código: ' + code);
    });
}

function drawCrosshair(canvas, opts) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);


    const {
        color,
        outline,
        outlineEnabled,
        outlineOpacity,
        dot,
        dotSize,
        dotOpacity,
        inner,
        outer,
        innerLen,
        innerLenV,
        outerLen,
        outerLenV,
        gap,
        outerGap,
        thick,
        outerThick,
        innerOpacity,
        outerOpacity
    } = opts;
    const scale = w / 56;
    const iLen = (innerLen || 6) * scale;
    const iLenV = (innerLenV ?? innerLen ?? 6) * scale;
    const oLen = (outerLen || 12) * scale;
    const oLenV = (outerLenV ?? outerLen ?? 12) * scale;
    const g = (gap || 3) * scale;
    const og = (outerGap ?? gap ?? 3) * scale;
    const th = (thick || 2) * scale;
    const oth = (outerThick || thick || 2) * scale;

    function drawRect(x, y, width, height, opacity, lineOutline = outlineEnabled) {
        if (opacity <= 0 || width <= 0 || height <= 0) return;
        if (lineOutline) {
            const grow = Math.max(1, scale * 0.75);
            ctx.fillStyle = withAlpha(outline, outlineOpacity);
            ctx.fillRect(x - grow, y - grow, width + grow * 2, height + grow * 2);
        }
        ctx.fillStyle = withAlpha(color, opacity);
        ctx.fillRect(x, y, width, height);
    }

    function drawLineGroup(lengthH, lengthV, offset, lineThickness, opacity) {
        drawRect(cx + offset, cy - lineThickness / 2, lengthH, lineThickness, opacity);
        drawRect(cx - offset - lengthH, cy - lineThickness / 2, lengthH, lineThickness, opacity);
        drawRect(cx - lineThickness / 2, cy + offset, lineThickness, lengthV, opacity);
        drawRect(cx - lineThickness / 2, cy - offset - lengthV, lineThickness, lengthV, opacity);
    }

    if (inner) {
        drawLineGroup(iLen, iLenV, g, th, innerOpacity);
    }

    if (outer) {
        drawLineGroup(oLen, oLenV, og, oth, outerOpacity);
    }

    if (dot) {
        const size = Math.max((dotSize || 2) * scale, scale);
        drawRect(cx - size / 2, cy - size / 2, size, size, dotOpacity);
    }
}

function parseCrosshairCode(code, fallback = {}) {
    const values = parsePrimaryCrosshairValues(code);
    const innerLen = numberValue(values['0l'], fallback.innerLen || 4);
    const innerLenV = numberValue(values['0v'], innerLen);
    const outerLen = numberValue(values['1l'], fallback.outerLen || 0);
    const outerLenV = numberValue(values['1v'], outerLen);
    const innerOpacity = opacityValue(values['0a'], 1);
    const outerOpacity = opacityValue(values['1a'], 1);
    const dotOpacity = opacityValue(values.a, 1);
    const outlineOpacity = opacityValue(values.o, 0);
    const color = values.u ? rgbaHexToCss(values.u) : valorantColor(values.c) || fallback.color || '#00ff00';

    return {
        color,
        outline: fallback.outlineColor || '#000000',
        outlineEnabled: values.h !== '0' && outlineOpacity > 0,
        outlineOpacity,
        dot: values.d === '1' || fallback.dotEnabled || false,
        dotSize: numberValue(values.z, 2),
        dotOpacity,
        inner: values['0b'] !== '0' && (innerLen > 0 || innerLenV > 0) && innerOpacity > 0 && fallback.innerLines !== false,
        outer: values['1b'] !== '0' && (outerLen > 0 || outerLenV > 0) && outerOpacity > 0,
        innerLen,
        innerLenV,
        outerLen,
        outerLenV,
        gap: numberValue(values['0o'], fallback.gap || 2),
        outerGap: numberValue(values['1o'], fallback.gap || 2),
        thick: numberValue(values['0t'], fallback.thick || 2),
        outerThick: numberValue(values['1t'], fallback.thick || 2),
        innerOpacity,
        outerOpacity
    };
}

function parsePrimaryCrosshairValues(code) {
    const values = {};
    const tokens = String(code || '').split(';');
    const primaryIndex = tokens.indexOf('P');
    const start = primaryIndex >= 0 ? primaryIndex + 1 : 0;

    for (let i = start; i < tokens.length - 1;) {
        const key = tokens[i];
        if (key === 'A' || key === 'S') break;
        if (!key || key === 'P') { i += 1; continue; }
        values[key] = tokens[i + 1];
        i += 2;
    }
    return values;
}

function numberValue(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function opacityValue(value, fallback) {
    return Math.min(1, Math.max(0, numberValue(value, fallback)));
}

function valorantColor(id) {
    const colors = {
        0: '#ffffff',
        1: '#00ff00',
        2: '#dfff00',
        3: '#ccff00',
        4: '#ffff00',
        5: '#00ffff',
        6: '#ff66ff',
        7: '#ff0000',
        8: '#ffffff'
    };
    return colors[id];
}

function rgbaHexToCss(value) {
    const hex = String(value || '').replace('#', '');
    if (!/^[0-9a-fA-F]{6,8}$/.test(hex)) return '#ffffff';
    return `#${hex.slice(0, 6)}`;
}

function withAlpha(hex, alpha) {
    const normalized = rgbaHexToCss(hex).slice(1);
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacityValue(alpha, 1)})`;
}

function openCrosshairDetail(id) {
    if (!window.LinedUpAuth?.requireLogin?.('Entre com uma conta para ver detalhes das miras.')) return;

    const crosshair = allCrosshairs.find(c => Number(c.id) === Number(id));
    if (!crosshair) return;

    currentDetailId = Number(id);
    renderCrosshairDetail(crosshair);

    const overlay = document.getElementById('crosshair-detail-overlay');
    if (overlay) overlay.style.display = 'flex';
}

function closeCrosshairDetail(e) {
    if (e && e.target !== document.getElementById('crosshair-detail-overlay')) return;
    const overlay = document.getElementById('crosshair-detail-overlay');
    if (overlay) overlay.style.display = 'none';
    currentDetailId = null;
}

function renderCrosshairDetail(crosshair) {
    document.getElementById('cx-detail-name').textContent = crosshair.name || 'Sem nome';
    document.getElementById('cx-detail-id').textContent = `ID: ${crosshair.id}`;

    const badge = document.getElementById('cx-detail-badge');
    badge.textContent = crosshair.category || 'Community';
    badge.className = `crosshair-badge badge-${escapeHtml(crosshair.category || 'Community')}`;

    document.getElementById('cx-detail-desc').textContent =
        crosshair.description && crosshair.description.trim()
            ? crosshair.description
            : 'Sem descrição cadastrada para esta mira.';

    document.getElementById('cx-detail-code').textContent = crosshair.code || '—';

    const copyBtn = document.getElementById('cx-detail-copy-btn');
    if (copyBtn) copyBtn.onclick = () => copyCrosshairCode(crosshair.code || '');

    const favoriteBtn = document.getElementById('cx-detail-favorite-btn');
    if (favoriteBtn) {
        const user = window.LinedUpAuth?.getCurrentUser?.();
        favoriteBtn.style.display = user ? '' : 'none';
        if (user) {
            const active = isFavoriteCrosshair(crosshair.id);
            favoriteBtn.classList.toggle('active', active);
            favoriteBtn.title = active ? 'Remover dos favoritos' : 'Marcar como favorito';
            const icon = favoriteBtn.querySelector('svg');
            if (icon) icon.setAttribute('fill', active ? 'currentColor' : 'none');
            favoriteBtn.onclick = async () => {
                await toggleCrosshairFavorite(null, crosshair.id);
                renderCrosshairDetail(crosshair);
            };
        }
    }

    const deleteBtn = document.getElementById('cx-detail-delete-btn');
    if (deleteBtn) {
        deleteBtn.style.display = isCrosshairAdmin() ? '' : 'none';
        deleteBtn.onclick = () => deleteCrosshair(crosshair.id);
    }

    const canvas = document.getElementById('cx-detail-canvas');
    if (canvas) drawCrosshair(canvas, parseCrosshairCode(crosshair.code, crosshair));

    renderCrosshairDetailNav(crosshair.id);
}

function renderCrosshairDetailNav(currentId) {
    const list = lastRenderedCrosshairs.length ? lastRenderedCrosshairs : allCrosshairs;
    const index = list.findIndex(c => Number(c.id) === Number(currentId));

    const prevBtn = document.getElementById('cx-detail-prev');
    const nextBtn = document.getElementById('cx-detail-next');
    if (prevBtn) prevBtn.disabled = index <= 0;
    if (nextBtn) nextBtn.disabled = index === -1 || index >= list.length - 1;

    const others = document.getElementById('cx-detail-others');
    if (!others) return;

    others.innerHTML = list.map(cx => `
        <button class="crosshair-other-item${Number(cx.id) === Number(currentId) ? ' active' : ''}"
            type="button" title="${escapeHtml(cx.name)}"
            onclick="openCrosshairDetail(${Number(cx.id)})">
            <canvas width="56" height="56" data-other-id="${cx.id}"></canvas>
        </button>
    `).join('');

    others.querySelectorAll('canvas[data-other-id]').forEach(canvas => {
        const cx = list.find(c => String(c.id) === canvas.dataset.otherId);
        if (cx) drawCrosshair(canvas, parseCrosshairCode(cx.code, cx));
    });
}

function goToAdjacentCrosshair(direction) {
    const list = lastRenderedCrosshairs.length ? lastRenderedCrosshairs : allCrosshairs;
    const index = list.findIndex(c => Number(c.id) === Number(currentDetailId));
    if (index === -1) return;

    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= list.length) return;

    openCrosshairDetail(list[nextIndex].id);
}

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && currentDetailId !== null) closeCrosshairDetail();
});

function openCrosshairModal() {
    if (!isCrosshairAdmin()) {
        showToast('Apenas administradores podem adicionar miras.');
        return;
    }
    const modal = document.getElementById('crosshair-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    renderPreview();
}

function closeCrosshairModal(e) {
    if (!e || e.target === document.getElementById('crosshair-modal')) {
        document.getElementById('crosshair-modal').style.display = 'none';
    }
}

function renderPreview() {
    const canvas = document.getElementById('cx-canvas');
    if (!canvas) return;
    const color = document.getElementById('cx-color')?.value || '#00FF00';
    const outline = document.getElementById('cx-outline')?.value || '#000000';
    drawCrosshair(canvas, {
        color, outline,
        dot: document.getElementById('cx-dot')?.checked || false,
        inner: document.getElementById('cx-inner')?.checked !== false,
        outer: document.getElementById('cx-outer')?.checked || false,
        innerLen: parseInt(document.getElementById('cx-inner-len')?.value) || 4,
        gap: parseInt(document.getElementById('cx-gap')?.value) || 2,
        thick: parseInt(document.getElementById('cx-thick')?.value) || 2
    });

    /* Update color text inputs */
    const ct = document.getElementById('cx-color-text');
    const ot = document.getElementById('cx-outline-text');
    if (ct) ct.value = color;
    if (ot) ot.value = outline;
}

function syncColor(input) {
    const hex = input.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        const cp = document.getElementById('cx-color');
        if (cp) cp.value = hex;
        renderPreview();
    }
}
function syncOutline(input) {
    const hex = input.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        const cp = document.getElementById('cx-outline');
        if (cp) cp.value = hex;
        renderPreview();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('cx-color')?.addEventListener('input', e => {
        const t = document.getElementById('cx-color-text');
        if (t) t.value = e.target.value;
        renderPreview();
    });
    document.getElementById('cx-outline')?.addEventListener('input', e => {
        const t = document.getElementById('cx-outline-text');
        if (t) t.value = e.target.value;
        renderPreview();
    });
});

function generateCode(opts) {
    /* Simplified Valorant-style code generation */
    const colorId = colorToValorantId(opts.color);
    const innerLen = opts.innerLen || 4;
    const gap = opts.gap || 2;
    const thick = opts.thick || 2;
    const dot = opts.dot ? 1 : 0;
    const inner = opts.inner ? 1 : 0;
    const outer = opts.outer ? 1 : 0;
    return `0;P;c;${colorId};h;0;d;1;z;1;f;0;0t;${thick};0l;${innerLen};0o;${gap};0a;1;0f;0;1b;${dot};1t;${thick};1l;12;1o;${gap};1a;1;1m;0;1f;0`;
}

function colorToValorantId(hex) {
    const map = {
        '#FFFFFF': 0, '#00FF00': 1, '#FF0000': 2, '#FFD700': 3,
        '#FF4655': 4, '#00FFFF': 5, '#FF69B4': 6, '#FF8C00': 7
    };
    return map[hex.toUpperCase()] ?? 5;
}

async function saveCrosshair() {
    if (!isCrosshairAdmin()) {
        showToast('Apenas administradores podem adicionar miras.');
        return;
    }

    const name = document.getElementById('cx-name')?.value.trim();
    const code = document.getElementById('cx-code')?.value.trim();
    const category = document.getElementById('cx-category')?.value;
    const desc = document.getElementById('cx-desc')?.value.trim();
    const color = document.getElementById('cx-color')?.value || '#00FF00';
    const outline = document.getElementById('cx-outline')?.value || '#000000';
    const dot = document.getElementById('cx-dot')?.checked || false;
    const inner = document.getElementById('cx-inner')?.checked !== false;
    const outer = document.getElementById('cx-outer')?.checked || false;
    const innerLen = parseInt(document.getElementById('cx-inner-len')?.value) || 4;
    const gap = parseInt(document.getElementById('cx-gap')?.value) || 2;
    const thick = parseInt(document.getElementById('cx-thick')?.value) || 2;

    if (!name) { showToast('Dê um nome para a mira'); return; }

    const finalCode = code || generateCode({ color, dot, inner, outer, innerLen, gap, thick });

    const newCx = {
        id: Date.now(),
        name, code: finalCode, category,
        description: desc,
        color, outlineColor: outline,
        dotEnabled: dot, innerLines: inner, outerLines: outer,
        innerLen, gap, thick,
        custom: true
    };

    const savedCrosshair = await persistCrosshair(newCx);
    allCrosshairs.push(savedCrosshair);
    currentCrosshairPage = Math.ceil(getFilteredCrosshairs().length / CROSSHAIRS_PER_PAGE);
    renderCrosshairs();
    closeCrosshairModal();
    showToast(`Mira "${name}" adicionada com sucesso!`);

    /* Reset form */
    ['cx-name', 'cx-code', 'cx-desc'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
}

async function persistCrosshair(crosshair) {
    try {
        const response = await fetch(CROSSHAIRS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(crosshair)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch {
        const saved = getCustomCrosshairs();
        saved.push(crosshair);
        localStorage.setItem(customCrosshairKey, JSON.stringify(saved));
        return crosshair;
    }
}

async function deleteCrosshair(id) {
    if (!isCrosshairAdmin()) {
        showToast('Apenas administradores podem remover miras.');
        return;
    }

    const crosshair = allCrosshairs.find(cx => Number(cx.id) === Number(id));
    if (!crosshair) return;
    if (!window.confirm(`Remover a mira "${crosshair.name}"?`)) return;

    try {
        const response = await fetch(`${CROSSHAIRS_API_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch {
        const saved = getCustomCrosshairs().filter(cx => Number(cx.id) !== Number(id));
        localStorage.setItem(customCrosshairKey, JSON.stringify(saved));
    }

    allCrosshairs = allCrosshairs.filter(cx => Number(cx.id) !== Number(id));
    closeCrosshairDetail();
    renderCrosshairs();
    showToast('Mira removida.');
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('crosshairs-grid')) loadCrosshairs();
});

window.LinedUpCrosshairs = {
    render: renderCrosshairs,
    setFilter(category) {
        currentFilter = category;
        renderCrosshairs();
    },
    search: searchCrosshairs
};
