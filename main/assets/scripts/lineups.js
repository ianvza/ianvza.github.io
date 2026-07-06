const lineupMaps = [
    { id: 'abyss', name: 'Abyss', image: 'img/maps/abyss.png', sites: ['A', 'B'], icon: '' },
    { id: 'ascent', name: 'Ascent', image: 'img/maps/ascent.png', sites: ['A', 'B'], icon: '' },
    { id: 'bind', name: 'Bind', image: 'img/maps/bind.png', sites: ['A', 'B'], icon: '' },
    { id: 'breeze', name: 'Breeze', image: 'img/maps/breeze.png', sites: ['A', 'B'], icon: '' },
    { id: 'corrode', name: 'Corrode', image: 'img/maps/corrode.png', sites: ['A', 'B'], icon: '' },
    { id: 'fracture', name: 'Fracture', image: 'img/maps/fracture.png', sites: ['A', 'B'], icon: '' },
    { id: 'haven', name: 'Haven', image: 'img/maps/haven.png', sites: ['A', 'B', 'C'], icon: '' },
    { id: 'icebox', name: 'Icebox', image: 'img/maps/icebox.png', sites: ['A', 'B'], icon: '' },
    { id: 'lotus', name: 'Lotus', image: 'img/maps/lotus.png', sites: ['A', 'B', 'C'], icon: '' },
    { id: 'pearl', name: 'Pearl', image: 'img/maps/pearl.png', sites: ['A', 'B'], icon: '' },
    { id: 'split', name: 'Split', image: 'img/maps/split.png', sites: ['A', 'B'], icon: '' },
    { id: 'summit', name: 'Summit', image: 'img/maps/summit.png', sites: ['A', 'B'], icon: '' },
    { id: 'sunset', name: 'Sunset', image: 'img/maps/sunset.png', sites: ['A', 'B'], icon: '' }
];

const LINEUPS_API_URL = '/lineups';
const LOCAL_LINEUPS_KEY = 'linedup_custom_lineups';

const mapLayouts = {
    abyss: { a: [70, 34], b: [31, 42], mid: [50, 52], attack: [[49, 84], [36, 79], [44, 82]], defense: [[52, 16], [41, 20], [60, 21]] },
    ascent: { a: [73, 32], b: [27, 35], mid: [50, 50], attack: [[50, 83], [34, 79], [46, 81]], defense: [[51, 18], [39, 23], [60, 22]] },
    bind: { a: [70, 37], b: [30, 33], mid: [50, 58], attack: [[53, 83], [35, 80], [47, 82]], defense: [[54, 18], [39, 20], [63, 22]] },
    breeze: { a: [69, 31], b: [28, 46], mid: [49, 52], attack: [[49, 84], [33, 78], [43, 80]], defense: [[52, 15], [39, 20], [61, 19]] },
    corrode: { a: [72, 42], b: [29, 35], mid: [50, 50], attack: [[50, 84], [32, 79], [44, 80]], defense: [[52, 16], [39, 21], [63, 20]] },
    fracture: { a: [69, 30], b: [30, 61], mid: [50, 47], attack: [[47, 86], [31, 82], [54, 83]], defense: [[53, 14], [38, 18], [62, 20]] },
    haven: { a: [74, 37], b: [49, 48], c: [26, 33], mid: [49, 57], attack: [[49, 84], [31, 79], [42, 82]], defense: [[50, 17], [34, 21], [64, 20]] },
    icebox: { a: [67, 28], b: [30, 50], mid: [48, 50], attack: [[50, 84], [34, 79], [43, 82]], defense: [[52, 16], [39, 20], [60, 21]] },
    lotus: { a: [72, 32], b: [50, 46], c: [28, 39], mid: [50, 57], attack: [[50, 84], [31, 80], [42, 82]], defense: [[51, 16], [38, 21], [61, 20]] },
    pearl: { a: [70, 34], b: [30, 60], mid: [50, 48], attack: [[51, 83], [35, 79], [46, 82]], defense: [[52, 17], [40, 21], [61, 21]] },
    split: { a: [70, 32], b: [28, 42], mid: [50, 44], attack: [[50, 84], [35, 79], [44, 80]], defense: [[51, 16], [39, 20], [61, 20]] },
    summit: { a: [70, 36], b: [30, 36], mid: [50, 53], attack: [[49, 84], [34, 79], [44, 82]], defense: [[52, 17], [39, 20], [61, 20]] },
    sunset: { a: [69, 38], b: [29, 36], mid: [50, 54], attack: [[50, 84], [35, 79], [45, 82]], defense: [[52, 16], [39, 21], [61, 20]] }
};

const mapCallouts = {
    abyss: {
        attack: [
            ['A Main', 69, 55], ['A Site', 72, 35], ['B Main', 29, 55], ['B Site', 31, 35], ['Mid', 50, 50], ['Atacante', 49, 84]
        ],
        defense: [
            ['A Tower', 70, 24], ['A Site', 72, 36], ['B Tower', 31, 25], ['B Site', 31, 41], ['Mid', 50, 51], ['Defensor', 52, 16]
        ]
    },
    ascent: {
        attack: [
            ['A Main', 69, 58], ['A Site', 73, 33], ['B Main', 28, 56], ['B Site', 27, 35], ['Mid', 50, 51], ['Atacante', 50, 83]
        ],
        defense: [
            ['A Heaven', 72, 24], ['A Site', 73, 33], ['Market', 35, 42], ['B Site', 27, 35], ['Mid', 50, 49], ['Defensor', 51, 18]
        ]
    },
    bind: {
        attack: [
            ['A Short', 62, 58], ['A Site', 70, 37], ['B Long', 28, 57], ['B Site', 30, 33], ['Teleporte', 50, 56], ['Atacante', 53, 83]
        ],
        defense: [
            ['A Heaven', 70, 27], ['A Site', 70, 37], ['Hookah', 36, 42], ['B Site', 30, 33], ['Teleporte', 50, 57], ['Defensor', 54, 18]
        ]
    },
    breeze: {
        attack: [
            ['A Cave', 66, 58], ['A Site', 69, 31], ['B Main', 29, 62], ['B Site', 28, 46], ['Mid Nest', 49, 52], ['Atacante', 49, 84]
        ],
        defense: [
            ['A Bridge', 68, 22], ['A Site', 69, 31], ['B Tunnel', 34, 35], ['B Site', 28, 46], ['Mid Nest', 49, 52], ['Defensor', 52, 15]
        ]
    },
    corrode: {
        attack: [
            ['A Main', 69, 61], ['A Site', 72, 42], ['B Main', 29, 57], ['B Site', 29, 35], ['Mid', 50, 50], ['Atacante', 50, 84]
        ],
        defense: [
            ['A Tower', 72, 30], ['A Site', 72, 42], ['B Tower', 31, 25], ['B Site', 29, 35], ['Mid', 50, 50], ['Defensor', 52, 16]
        ]
    },
    fracture: {
        attack: [
            ['A Dish', 69, 50], ['A Site', 69, 30], ['B Arcade', 31, 73], ['B Site', 30, 61], ['Rope', 50, 47], ['Atacante', 47, 86]
        ],
        defense: [
            ['A Drop', 64, 22], ['A Site', 69, 30], ['B Tower', 32, 50], ['B Site', 30, 61], ['Rope', 50, 47], ['Defensor', 53, 14]
        ]
    },
    haven: {
        attack: [
            ['A Long', 72, 60], ['A Site', 74, 37], ['B Site', 49, 48], ['C Long', 27, 56], ['C Site', 26, 33], ['Atacante', 49, 84]
        ],
        defense: [
            ['A Heaven', 73, 27], ['A Site', 74, 37], ['B Site', 49, 48], ['C Garage', 34, 43], ['C Site', 26, 33], ['Defensor', 50, 17]
        ]
    },
    icebox: {
        attack: [
            ['A Belt', 66, 52], ['A Site', 67, 28], ['B Green', 30, 66], ['B Site', 30, 50], ['Mid Tube', 48, 50], ['Atacante', 50, 84]
        ],
        defense: [
            ['A Rafters', 67, 18], ['A Site', 67, 28], ['B Snowman', 30, 38], ['B Site', 30, 50], ['Mid Tube', 48, 50], ['Defensor', 52, 16]
        ]
    },
    lotus: {
        attack: [
            ['A Main', 70, 59], ['A Site', 72, 32], ['B Main', 50, 61], ['B Site', 50, 46], ['C Main', 29, 60], ['C Site', 28, 39]
        ],
        defense: [
            ['A Tree', 66, 25], ['A Site', 72, 32], ['B Site', 50, 46], ['C Bend', 34, 31], ['C Site', 28, 39], ['Defensor', 51, 16]
        ]
    },
    pearl: {
        attack: [
            ['A Main', 67, 58], ['A Site', 70, 34], ['B Long', 31, 73], ['B Site', 30, 60], ['Mid Plaza', 50, 48], ['Atacante', 51, 83]
        ],
        defense: [
            ['A Link', 65, 25], ['A Site', 70, 34], ['B Hall', 31, 48], ['B Site', 30, 60], ['Mid Plaza', 50, 48], ['Defensor', 52, 17]
        ]
    },
    split: {
        attack: [
            ['A Main', 68, 57], ['A Site', 70, 32], ['B Main', 28, 58], ['B Site', 28, 42], ['Mid', 50, 44], ['Atacante', 50, 84]
        ],
        defense: [
            ['A Heaven', 69, 23], ['A Site', 70, 32], ['B Heaven', 31, 32], ['B Site', 28, 42], ['Mid Vent', 50, 44], ['Defensor', 51, 16]
        ]
    },
    summit: {
        attack: [
            ['A Main', 68, 59], ['A Site', 70, 36], ['B Main', 30, 58], ['B Site', 30, 36], ['Mid', 50, 53], ['Atacante', 49, 84]
        ],
        defense: [
            ['A Tower', 70, 25], ['A Site', 70, 36], ['B Tower', 30, 25], ['B Site', 30, 36], ['Mid', 50, 53], ['Defensor', 52, 17]
        ]
    },
    sunset: {
        attack: [
            ['A Main', 67, 60], ['A Site', 69, 38], ['B Main', 30, 58], ['B Site', 29, 36], ['Mid Top', 50, 54], ['Atacante', 50, 84]
        ],
        defense: [
            ['A Elbow', 64, 28], ['A Site', 69, 38], ['B Market', 34, 29], ['B Site', 29, 36], ['Mid Top', 50, 54], ['Defensor', 52, 16]
        ]
    }
};

const fallbackAgents = [
    'Astra', 'Breach', 'Brimstone', 'Chamber', 'Clove', 'Cypher', 'Deadlock', 'Fade',
    'Gekko', 'Harbor', 'Iso', 'Jett', 'KAY/O', 'Killjoy', 'Neon', 'Omen',
    'Phoenix', 'Raze', 'Reyna', 'Sage', 'Skye', 'Sova', 'Tejo', 'Viper',
    'Vyse', 'Waylay', 'Yoru'
].map(name => ({ displayName: name, displayIcon: '', role: { displayName: 'Agente' } }));

const lineupState = {
    mapId: 'abyss',
    side: 'attack',
    agent: null,
    selectedLineup: null,
    agents: [],
    lineups: [],
    lineupsReady: false,
    lineupsStorage: 'api',
    mapDropdownOpen: false,
    createModalOpen: false,
    creatingLineup: false,
    removingLineup: false,
    pendingRemovalIndex: null,
    pointMode: '',
    draftLineup: null,
    zoom: 1,
    maxZoom: 1.8,
    panX: 0,
    panY: 0,
    dragging: false,
    dragMoved: false,
    dragX: 0,
    dragY: 0,
    dragStartX: 0,
    dragStartY: 0,
    pendingMarkerIndex: null,
    suppressMarkerClick: false
};
let lineupsOriginalMarkup = '';

function initLineupsPage() {
    const app = document.getElementById('lineups-app');
    if (!app || app.dataset.bound === 'true') return;
    if (!isLineupsUserLogged()) {
        renderLineupsAuthGate(app);
        return;
    }

    app.classList.remove('lineups-auth-required');
    app.innerHTML = lineupsOriginalMarkup || app.innerHTML;
    app.dataset.bound = 'true';

    setupMapDropdown();
    setupSideToggle();
    setupLineupCreator();
    setupMapInteractions();
    renderMapDropdown();
    loadLineupData();
}

function isLineupsUserLogged() {
    return Boolean(window.LinedUpAuth?.getCurrentUser?.());
}

function renderLineupsAuthGate(app) {
    if (!app) return;
    app.dataset.bound = 'false';
    if (!lineupsOriginalMarkup) lineupsOriginalMarkup = app.innerHTML;
    app.classList.add('lineups-auth-required');
    app.innerHTML = `
        <div class="lineups-login-gate">
            <span class="lineups-kicker">Lineups</span>
            <h1>Entre para acessar lineups</h1>
            <p>Use uma conta para navegar pelos mapas, agentes, videos e marcacoes da ferramenta.</p>
            <div class="lineups-login-actions">
                <button class="btn btn-primary" type="button" onclick="LinedUpAuth.openLogin()">
                    Login
                </button>
                <button class="btn btn-ghost" type="button" onclick="LinedUpAuth.openLogin('register')">
                    Criar conta
                </button>
            </div>
        </div>
    `;
}

function setupMapDropdown() {
    const trigger = document.getElementById('lineup-map-trigger');
    const dropdown = document.getElementById('lineup-map-dropdown');
    if (!trigger || !dropdown) return;

    trigger.addEventListener('click', event => {
        event.stopPropagation();
        lineupState.mapDropdownOpen = !lineupState.mapDropdownOpen;
        renderMapDropdown();
    });

    dropdown.addEventListener('click', event => event.stopPropagation());

    document.addEventListener('click', () => {
        if (!lineupState.mapDropdownOpen) return;
        lineupState.mapDropdownOpen = false;
        renderMapDropdown();
    });
}

function renderMapDropdown() {
    const dropdown = document.getElementById('lineup-map-dropdown');
    const trigger = document.getElementById('lineup-map-trigger');
    if (!dropdown) return;

    dropdown.classList.toggle('open', lineupState.mapDropdownOpen);
    if (trigger) trigger.setAttribute('aria-expanded', String(lineupState.mapDropdownOpen));

    dropdown.innerHTML = lineupMaps.map(map => `
        <button class="lineup-map-tile${map.id === lineupState.mapId ? ' active' : ''}" type="button" data-map="${map.id}">
            <img src="${map.image}" alt="${map.name}" loading="lazy" />
            <span>${map.name}</span>
        </button>
    `).join('');

    dropdown.querySelectorAll('.lineup-map-tile').forEach(tile => {
        tile.addEventListener('click', () => selectMap(tile.dataset.map));
    });
}

function selectMap(mapId) {
    lineupState.mapId = mapId || lineupState.mapId;
    lineupState.selectedLineup = null;
    lineupState.pendingRemovalIndex = null;
    lineupState.mapDropdownOpen = false;
    resetMapTransform();
    renderMapDropdown();
    syncLineupCreatorFields();
    renderLineupsTool();
}

function setupSideToggle() {
    document.querySelectorAll('.lineup-side-toggle button').forEach(button => {
        button.addEventListener('click', () => {
            lineupState.side = button.dataset.side || 'attack';
            lineupState.selectedLineup = null;
            lineupState.pendingRemovalIndex = null;
            document.querySelectorAll('.lineup-side-toggle button').forEach(item => {
                item.classList.toggle('active', item === button);
            });
            syncLineupCreatorFields();
            renderLineupsTool();
        });
    });
}

async function loadLineupData() {
    await Promise.all([loadLineupMaps(), loadLineupAgents(), loadSavedLineups()]);
    renderMapDropdown();
    renderLineupsTool();
}

async function loadLineupMaps() {
    await loadValorantMapImages();
}

async function loadValorantMapImages() {
    try {
        const response = await fetch('https://valorant-api.com/v1/maps?language=pt-BR');
        const payload = await response.json();
        const apiMaps = new Map((payload.data || []).map(map => [String(map.displayName || '').toLowerCase(), map]));
        lineupMaps.forEach(map => {
            const apiMap = apiMaps.get(map.name.toLowerCase());
            if (!apiMap) return;
            map.icon = apiMap.displayIcon || map.icon;
            map.image = apiMap.splash || map.image;
        });
    } catch {
        // Local splash images remain available if the public API cannot be reached.
    }
}

async function loadLineupAgents() {
    try {
        const response = await fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=pt-BR');
        const payload = await response.json();
        lineupState.agents = (payload.data || [])
            .filter(agent => agent.displayName && !agent.displayName.includes('Training'))
            .sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'));
    } catch {
        lineupState.agents = fallbackAgents;
    }

    if (!lineupState.agents.length) lineupState.agents = fallbackAgents;
    lineupState.agent = lineupState.agents.find(agent => getAgentName(agent) === 'Sova') || lineupState.agents[0];
    renderAgentGrid();
}

async function loadSavedLineups() {
    try {
        const response = await fetch(LINEUPS_API_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        lineupState.lineups = Array.isArray(payload) ? payload.map(normalizeSavedLineup).filter(Boolean) : [];
        lineupState.lineupsStorage = 'api';
    } catch {
        lineupState.lineups = getLocalLineups();
        lineupState.lineupsStorage = 'local';
    } finally {
        lineupState.lineupsReady = true;
    }
}

function getAgentName(agent) {
    return agent?.name || agent?.displayName || 'Agente';
}

function getAgentId(agent) {
    return agent?.id || slugify(getAgentName(agent));
}

function getAgentImage(agent) {
    return agent?.thumb_image_url || agent?.full_image_url || agent?.displayIcon || '';
}

function getAgentUtilities(agent) {
    if (Array.isArray(agent?.abilities)) {
        return agent.abilities
            .filter(ability => ability?.displayName && !/passiva/i.test(ability.slot || ''))
            .map(ability => ({
                id: slugify(ability.displayName),
                name: ability.displayName,
                icon: ability.displayIcon || ''
            }));
    }

    if (Array.isArray(agent?.utilities)) {
        return agent.utilities.map(utility => ({
            id: utility.id || slugify(utility.name),
            name: utility.name || utility.displayName || 'Habilidade',
            icon: utility.icon_url || utility.displayIcon || ''
        }));
    }

    return [
        { id: 'habilidade-1', name: 'Habilidade 1', icon: '' },
        { id: 'habilidade-2', name: 'Habilidade 2', icon: '' },
        { id: 'habilidade-3', name: 'Habilidade 3', icon: '' },
        { id: 'ultimate', name: 'Ultimate', icon: '' }
    ];
}

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/kay\/o/g, 'kay-o')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function renderAgentGrid() {
    const grid = document.getElementById('lineup-agent-grid');
    if (!grid) return;

    grid.innerHTML = lineupState.agents.map(agent => {
        const agentName = getAgentName(agent);
        const agentId = getAgentId(agent);
        const imageUrl = getAgentImage(agent);
        const active = agentId === getAgentId(lineupState.agent) ? ' active' : '';
        const image = imageUrl
            ? `<img src="${imageUrl}" alt="${escapeHtml(agentName)}" loading="lazy" />`
            : `<div class="agent-fallback">${agentName.slice(0, 2).toUpperCase()}</div>`;
        return `
            <button class="agent-select-card${active}" type="button" data-agent="${escapeHtml(agentId)}">
                ${image}
                <span>${escapeHtml(agentName)}</span>
            </button>
        `;
    }).join('');

    grid.querySelectorAll('.agent-select-card').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.agent;
            lineupState.agent = lineupState.agents.find(agent => getAgentId(agent) === id) || lineupState.agent;
            lineupState.selectedLineup = null;
            lineupState.pendingRemovalIndex = null;
            renderAgentGrid();
            syncLineupCreatorFields();
            renderLineupsTool();
        });
    });
}

function setupLineupCreator() {
    const openButton = document.getElementById('open-lineup-creator');
    const removeButton = document.getElementById('toggle-lineup-removal');
    const confirmRemoveButton = document.getElementById('confirm-lineup-removal');
    const form = document.getElementById('lineup-creator-form');
    const agentSelect = document.getElementById('lineup-create-agent');
    const mapSelect = document.getElementById('lineup-create-map');
    const sideSelect = document.getElementById('lineup-create-side');

    openButton?.addEventListener('click', openLineupCreator);
    removeButton?.addEventListener('click', toggleLineupRemoval);
    confirmRemoveButton?.addEventListener('click', confirmLineupRemoval);
    form?.addEventListener('submit', saveCreatedLineup);
    agentSelect?.addEventListener('change', () => {
        const agent = lineupState.agents.find(item => getAgentId(item) === agentSelect.value);
        if (agent) lineupState.agent = agent;
        lineupState.selectedLineup = null;
        renderAgentGrid();
        renderAbilitySelect();
        renderLineupsTool();
    });
    mapSelect?.addEventListener('change', () => selectMap(mapSelect.value));
    sideSelect?.addEventListener('change', () => {
        lineupState.side = sideSelect.value === 'defense' ? 'defense' : 'attack';
        document.querySelectorAll('.lineup-side-toggle button').forEach(button => {
            button.classList.toggle('active', button.dataset.side === lineupState.side);
        });
        lineupState.selectedLineup = null;
        lineupState.pendingRemovalIndex = null;
        renderLineupsTool();
    });

    document.querySelectorAll('#lineup-point-tools [data-point-mode]').forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.dataset.pointMode;
            if (mode === 'undo') {
                undoDraftPoint();
                return;
            }
            lineupState.pointMode = mode;
            renderPointToolState();
        });
    });
}

function isLineupAdmin() {
    return window.LinedUpAuth?.getCurrentUser?.()?.type === 'admin';
}

function syncLineupAdminControls() {
    const app = document.getElementById('lineups-app');
    if (app && !isLineupsUserLogged()) {
        closeLineupVideo();
        renderLineupsAuthGate(app);
        return;
    }

    if (isLineupAdmin()) {
        renderRemovalState();
        return;
    }

    if (lineupState.creatingLineup) closeLineupCreator();
    closeLineupVideo();
    lineupState.removingLineup = false;
    lineupState.pendingRemovalIndex = null;
    renderRemovalState();
    renderLineupsTool();
}

function toggleLineupRemoval() {
    if (!isLineupAdmin()) return;
    lineupState.removingLineup = !lineupState.removingLineup;
    lineupState.pendingRemovalIndex = null;
    lineupState.selectedLineup = null;
    closeLineupVideo();
    renderRemovalState();
    renderLineupsTool();
}

async function confirmLineupRemoval() {
    if (!isLineupAdmin()) return;
    const lineups = getCurrentLineups();
    const index = lineupState.pendingRemovalIndex;
    const lineup = Number.isInteger(index) ? lineups[index] : null;
    if (!lineup) {
        updateLineupStatus(lineups, 'Selecione uma lineup no mapa para remover.');
        return;
    }

    await removeLineup(lineup);
    lineupState.selectedLineup = null;
    lineupState.pendingRemovalIndex = null;
    lineupState.removingLineup = false;
    renderRemovalState();
    renderLineupsTool();
}

async function removeLineup(lineup) {
    if (!isLineupAdmin()) return;
    if (lineupState.lineupsStorage === 'api') {
        try {
            const response = await fetch(`${LINEUPS_API_URL}/${encodeURIComponent(lineup.id)}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
        } catch {
            lineupState.lineupsStorage = 'local';
        }
    }

    lineupState.lineups = lineupState.lineups.filter(item => String(item.id) !== String(lineup.id));
    if (lineupState.lineupsStorage === 'local') saveLocalLineups();
}

function renderRemovalState() {
    const removeButton = document.getElementById('toggle-lineup-removal');
    const confirmButton = document.getElementById('confirm-lineup-removal');
    removeButton?.classList.toggle('active', lineupState.removingLineup);
    if (removeButton) removeButton.textContent = lineupState.removingLineup ? 'Cancelar Remocao' : 'Remover Lineup';
    if (confirmButton) confirmButton.hidden = !lineupState.removingLineup;
    if (confirmButton) confirmButton.disabled = !Number.isInteger(lineupState.pendingRemovalIndex);
}

function openLineupCreator() {
    if (!isLineupAdmin()) return;
    const modal = document.getElementById('lineup-creator-modal');
    if (!modal) return;

    lineupState.createModalOpen = true;
    lineupState.creatingLineup = true;
    lineupState.pointMode = 'start';
    lineupState.draftLineup = {
        start: null,
        target: null,
        path: []
    };

    syncLineupCreatorFields(true);
    modal.style.display = 'flex';
    renderPointToolState();
    renderDraftLineupPreview();
}

function closeLineupCreator(event) {
    if (event && event.target !== document.getElementById('lineup-creator-modal')) return;
    const modal = document.getElementById('lineup-creator-modal');
    if (modal) modal.style.display = 'none';
    lineupState.createModalOpen = false;
    lineupState.creatingLineup = false;
    lineupState.pointMode = '';
    lineupState.draftLineup = null;
    renderPointToolState();
    renderLineupsTool();
}

window.closeLineupCreator = closeLineupCreator;

function syncLineupCreatorFields(rebuild = false) {
    const mapSelect = document.getElementById('lineup-create-map');
    const sideSelect = document.getElementById('lineup-create-side');
    const agentSelect = document.getElementById('lineup-create-agent');
    if (!mapSelect || !sideSelect || !agentSelect) return;

    if (rebuild || !mapSelect.options.length) {
        mapSelect.innerHTML = lineupMaps.map(map => `<option value="${map.id}">${escapeHtml(map.name)}</option>`).join('');
    }
    if (rebuild || !agentSelect.options.length) {
        agentSelect.innerHTML = lineupState.agents.map(agent => {
            const id = getAgentId(agent);
            return `<option value="${escapeHtml(id)}">${escapeHtml(getAgentName(agent))}</option>`;
        }).join('');
    }

    mapSelect.value = lineupState.mapId;
    sideSelect.value = lineupState.side;
    agentSelect.value = getAgentId(lineupState.agent);
    renderAbilitySelect();
}

function renderAbilitySelect() {
    const abilitySelect = document.getElementById('lineup-create-ability');
    if (!abilitySelect) return;
    const abilities = getAgentUtilities(lineupState.agent);
    abilitySelect.innerHTML = abilities.map(ability => (
        `<option value="${escapeHtml(ability.id)}">${escapeHtml(ability.name)}</option>`
    )).join('');
}

function renderPointToolState() {
    const hint = document.getElementById('lineup-create-hint');
    const summary = document.getElementById('lineup-point-summary');
    const labels = {
        start: 'Clique no mapa para marcar onde o personagem fica.',
        path: 'Clique no mapa para adicionar um ponto do caminho.',
        target: 'Clique no mapa para marcar onde a habilidade cai.'
    };

    document.querySelectorAll('#lineup-point-tools [data-point-mode]').forEach(button => {
        button.classList.toggle('active', button.dataset.pointMode === lineupState.pointMode);
    });

    if (hint) {
        hint.hidden = !lineupState.creatingLineup || !lineupState.pointMode;
        hint.textContent = labels[lineupState.pointMode] || '';
    }

    if (summary) {
        const draft = lineupState.draftLineup || {};
        summary.textContent = `Inicio: ${draft.start ? 'marcado' : 'pendente'} | Caminho: ${(draft.path || []).length} ponto(s) | Fim: ${draft.target ? 'marcado' : 'pendente'}`;
    }
}

function undoDraftPoint() {
    const draft = lineupState.draftLineup;
    if (!draft) return;
    if (draft.path.length) draft.path.pop();
    else if (draft.target) draft.target = null;
    else if (draft.start) draft.start = null;
    renderPointToolState();
    renderDraftLineupPreview();
}

function handleLineupPointClick(event) {
    if (!lineupState.creatingLineup || !lineupState.pointMode) return;
    if (event.target.closest('.map-zoom-controls')) return;
    const point = getMapPercentFromEvent(event);
    const draft = lineupState.draftLineup;
    if (!point || !draft) return;

    if (lineupState.pointMode === 'start') {
        draft.start = point;
        lineupState.pointMode = 'target';
    } else if (lineupState.pointMode === 'target') {
        draft.target = point;
        lineupState.pointMode = 'path';
    } else if (lineupState.pointMode === 'path') {
        draft.path.push(point);
    }

    renderPointToolState();
    renderDraftLineupPreview();
}

function getMapPercentFromEvent(event) {
    const layer = document.getElementById('map-zoom-layer');
    if (!layer) return null;
    const rect = layer.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return fromDisplayPoint([
        clampPercent(((event.clientX - rect.left) / rect.width) * 100),
        clampPercent(((event.clientY - rect.top) / rect.height) * 100)
    ]);
}

async function saveCreatedLineup(event) {
    event.preventDefault();
    if (!isLineupAdmin()) return;
    const draft = lineupState.draftLineup;
    if (!draft?.start || !draft?.target) {
        showLineupCreatorMessage('Marque o inicio e o fim do lineup no mapa.');
        return;
    }

    const map = getMapById(lineupState.mapId);
    const agent = lineupState.agent;
    const ability = getAgentUtilities(agent).find(item => item.id === document.getElementById('lineup-create-ability')?.value)
        || getAgentUtilities(agent)[0];
    const titleInput = document.getElementById('lineup-create-title');
    const videoInput = document.getElementById('lineup-create-video');
    const videoUrl = String(videoInput?.value || '').trim();

    const lineup = normalizeSavedLineup({
        id: `lineup-${Date.now()}`,
        mapId: map.id,
        mapName: map.name,
        side: lineupState.side,
        agentId: getAgentId(agent),
        agentName: getAgentName(agent),
        agentIcon: getAgentImage(agent),
        abilityId: ability.id,
        abilityName: ability.name,
        abilityIcon: ability.icon,
        title: String(titleInput?.value || '').trim() || `${ability.name} - ${map.name}`,
        videoUrl,
        start: draft.start,
        target: draft.target,
        path: draft.path,
        createdAt: new Date().toISOString()
    });

    if (!lineup) return;

    const saved = await persistLineup(lineup);
    lineupState.lineups.push(saved);
    lineupState.selectedLineup = null;
    closeLineupCreator();
    renderLineupsTool();
}

async function persistLineup(lineup) {
    if (lineupState.lineupsStorage === 'api') {
        try {
            const response = await fetch(LINEUPS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lineup)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return normalizeSavedLineup(await response.json()) || lineup;
        } catch {
            lineupState.lineupsStorage = 'local';
        }
    }

    saveLocalLineups();
    const local = [...lineupState.lineups, lineup];
    localStorage.setItem(LOCAL_LINEUPS_KEY, JSON.stringify(local));
    return lineup;
}

function showLineupCreatorMessage(message) {
    const summary = document.getElementById('lineup-point-summary');
    if (summary) summary.textContent = message;
}

function renderLineupsTool() {
    const map = lineupMaps.find(item => item.id === lineupState.mapId) || lineupMaps[0];
    const thumb = document.getElementById('lineup-map-thumb');
    const selectedName = document.getElementById('selected-map-name');
    const tacticalMap = document.getElementById('tactical-map-img');
    const title = document.getElementById('lineup-board-title');
    const agentPill = document.getElementById('selected-agent-pill');

    if (thumb) thumb.src = map.image;
    if (selectedName) selectedName.textContent = map.name;
    if (tacticalMap) {
        const source = getTacticalMapSource(map);
        tacticalMap.onload = () => {
            updateMapLayerFrame();
            updateMapZoomLimit();
            setMapZoom(lineupState.zoom);
        };
        tacticalMap.dataset.mapSource = source;
        tacticalMap.src = source;
        tacticalMap.classList.toggle('is-vector', isVectorMapSource(source));
        tacticalMap.classList.toggle('is-splash', !isVectorMapSource(source) && !map.icon);
        if (tacticalMap.complete) {
            updateMapLayerFrame();
            updateMapZoomLimit();
            setMapZoom(lineupState.zoom);
        }
    }
    if (title) title.textContent = `${map.name} - ${lineupState.side === 'attack' ? 'Atacando' : 'Defendendo'}`;
    if (agentPill) agentPill.textContent = getAgentName(lineupState.agent);

    const lineups = getCurrentLineups();
    renderLineupMarkers(lineups, map);
    renderLineupVideo(lineups);
    renderRemovalState();
    renderDraftLineupPreview();
    applyMapTransform();
}

function getTacticalMapSource(map) {
    return map.icon || map.image;
}

function isVectorMapSource(source) {
    return String(source || '').includes('/api/map-svg') || String(source || '').endsWith('.svg');
}

function getCurrentLineups() {
    const agentId = getAgentId(lineupState.agent);
    return lineupState.lineups
        .filter(lineup => (
            lineup.mapId === lineupState.mapId
            && lineup.agentId === agentId
            && (lineup.side || 'attack') === lineupState.side
        ))
        .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
}

function normalizeSavedLineup(lineup) {
    if (!lineup || !lineup.mapId || !lineup.agentId || !lineup.abilityId) return null;
    const start = normalizePoint(lineup.start);
    const target = normalizePoint(lineup.target);
    if (!start || !target) return null;
    return {
        id: lineup.id || `lineup-${Date.now()}`,
        mapId: String(lineup.mapId),
        mapName: lineup.mapName || getMapById(lineup.mapId)?.name || '',
        side: lineup.side === 'defense' ? 'defense' : 'attack',
        agentId: String(lineup.agentId),
        agentName: lineup.agentName || 'Agente',
        agentIcon: lineup.agentIcon || '',
        abilityId: String(lineup.abilityId),
        abilityName: lineup.abilityName || 'Habilidade',
        utilityName: lineup.abilityName || 'Habilidade',
        utilityIcon: lineup.abilityIcon || lineup.utilityIcon || '',
        title: lineup.title || lineup.abilityName || 'Lineup',
        videoUrl: lineup.videoUrl || '',
        videoEmbedUrl: getYoutubeEmbedUrl(lineup.videoUrl || ''),
        start,
        target,
        path: Array.isArray(lineup.path) ? lineup.path.map(normalizePoint).filter(Boolean) : [],
        lineups: [{
            points: [pointToObject(start), ...(Array.isArray(lineup.path) ? lineup.path.map(normalizePoint).filter(Boolean).map(pointToObject) : []), pointToObject(target)]
        }],
        count: 1,
        createdAt: lineup.createdAt || new Date().toISOString()
    };
}

function normalizePoint(point) {
    if (Array.isArray(point) && point.length >= 2) return [clampPercent(point[0]), clampPercent(point[1])];
    if (point && Number.isFinite(Number(point.left)) && Number.isFinite(Number(point.top))) {
        return [clampPercent(point.left), clampPercent(point.top)];
    }
    return null;
}

function pointToObject(point) {
    return { left: point[0], top: point[1] };
}

function getMapById(mapId) {
    return lineupMaps.find(map => map.id === mapId) || lineupMaps[0];
}

function getLocalLineups() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_LINEUPS_KEY) || '[]').map(normalizeSavedLineup).filter(Boolean);
    } catch {
        return [];
    }
}

function saveLocalLineups() {
    localStorage.setItem(LOCAL_LINEUPS_KEY, JSON.stringify(lineupState.lineups));
}

function clampPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 50;
    return Math.max(0, Math.min(100, number));
}

function renderLineupMarkers(lineups, map) {
    const markerLayer = document.getElementById('lineup-marker-layer');
    const pathLayer = document.getElementById('lineup-path-layer');
    if (!markerLayer || !pathLayer) return;

    updateLineupStatus(lineups);

    const mapLabels = '';

    const selectedIndex = Number.isInteger(lineupState.selectedLineup) ? lineupState.selectedLineup : null;
    const selectedLineup = selectedIndex !== null ? lineups[selectedIndex] : null;
    const selectedOrigins = selectedLineup ? renderSelectedLineupOrigins(selectedLineup) : '';

    markerLayer.innerHTML = mapLabels + lineups.map((lineup, index) => `
        <button class="lineup-marker${index === lineupState.selectedLineup ? ' active' : ''}${index === lineupState.pendingRemovalIndex ? ' pending-removal' : ''}" type="button"
            style="${pointStyle(lineup.target)}" data-index="${index}"
            title="${escapeHtml(lineup.title)}">
            ${lineup.utilityIcon
                ? `<img src="${lineup.utilityIcon}" alt="${escapeHtml(lineup.utilityName)}" loading="lazy" />`
                : lineup.number}
            ${lineup.count > 1 ? `<span class="lineup-marker-count">${lineup.count}</span>` : ''}
        </button>
    `).join('') + selectedOrigins;

    pathLayer.innerHTML = selectedLineup ? selectedLineup.lineups.map(item => {
        const pathPoints = getLineupPathPoints(item, selectedLineup.target);
        return `<polyline points="${pathPoints.map(point => toDisplayPoint(point).join(',')).join(' ')}" />`;
    }).join('') : '';

    markerLayer.querySelectorAll('.lineup-marker').forEach(marker => {
        marker.addEventListener('click', () => {
            if (lineupState.suppressMarkerClick) return;
            const index = Number(marker.dataset.index || 0);
            if (lineupState.removingLineup) {
                lineupState.pendingRemovalIndex = lineupState.pendingRemovalIndex === index ? null : index;
                lineupState.selectedLineup = null;
                closeLineupVideo();
                renderRemovalState();
                renderLineupsTool();
                return;
            }
            lineupState.selectedLineup = lineupState.selectedLineup === index ? null : index;
            renderLineupsTool();
        });
    });

    markerLayer.querySelectorAll('.lineup-agent-point').forEach(origin => {
        origin.addEventListener('click', () => {
            if (lineupState.removingLineup) return;
            const index = Number(origin.dataset.index || lineupState.selectedLineup || 0);
            lineupState.selectedLineup = index;
            renderLineupVideo(lineups);
        });
    });
}

function renderDraftLineupPreview() {
    const markerLayer = document.getElementById('lineup-marker-layer');
    const pathLayer = document.getElementById('lineup-path-layer');
    if (!markerLayer || !pathLayer) return;

    markerLayer.querySelectorAll('.lineup-draft-point').forEach(point => point.remove());
    pathLayer.querySelectorAll('.lineup-draft-path').forEach(path => path.remove());

    const draft = lineupState.draftLineup;
    if (!lineupState.creatingLineup || !draft) return;

    const points = [draft.start, ...(draft.path || []), draft.target].filter(Boolean);
    if (points.length > 1) {
        pathLayer.insertAdjacentHTML('beforeend', `
            <polyline class="lineup-draft-path" points="${points.map(point => toDisplayPoint(point).join(',')).join(' ')}" />
        `);
    }

    if (draft.start) {
        markerLayer.insertAdjacentHTML('beforeend', `
            <span class="lineup-draft-point start" style="${pointStyle(draft.start)}">I</span>
        `);
    }
    (draft.path || []).forEach((point, index) => {
        markerLayer.insertAdjacentHTML('beforeend', `
            <span class="lineup-draft-point path" style="${pointStyle(point)}">${index + 1}</span>
        `);
    });
    if (draft.target) {
        markerLayer.insertAdjacentHTML('beforeend', `
            <span class="lineup-draft-point target" style="${pointStyle(draft.target)}">F</span>
        `);
    }
}

function renderLineupVideo(lineups) {
    const panel = document.getElementById('lineup-video-modal');
    const title = document.getElementById('lineup-video-title');
    const frame = document.getElementById('lineup-video-frame');
    if (!panel || !title || !frame) return;

    const selectedIndex = Number.isInteger(lineupState.selectedLineup) ? lineupState.selectedLineup : null;
    const selectedLineup = selectedIndex !== null ? lineups[selectedIndex] : null;
    if (!selectedLineup || lineupState.removingLineup) {
        panel.style.display = 'none';
        frame.innerHTML = '';
        return;
    }

    panel.style.display = 'flex';
    title.textContent = selectedLineup.title || selectedLineup.abilityName || 'Lineup';
    if (selectedLineup.videoEmbedUrl) {
        frame.innerHTML = `
            <iframe src="${selectedLineup.videoEmbedUrl}" title="${escapeHtml(selectedLineup.title)}"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen></iframe>
        `;
    } else {
        frame.innerHTML = '<div class="lineup-video-empty">Este lineup ainda nao tem video vinculado.</div>';
    }
}

function closeLineupVideo(event) {
    if (event && event.target !== document.getElementById('lineup-video-modal')) return;
    const panel = document.getElementById('lineup-video-modal');
    const frame = document.getElementById('lineup-video-frame');
    if (panel) panel.style.display = 'none';
    if (frame) frame.innerHTML = '';
}

window.closeLineupVideo = closeLineupVideo;

function renderSelectedLineupOrigins(selectedLineup) {
    const agentImage = selectedLineup.agentIcon || getAgentImage(lineupState.agent);
    const agentName = selectedLineup.agentName || getAgentName(lineupState.agent);
    return selectedLineup.lineups.map((lineup, index) => {
        const start = getLineupStartPoint(lineup);
        const offset = selectedLineup.lineups.length > 1 ? ((index % 3) - 1) * 1.2 : 0;
        const left = clampPercent(start[0] + offset);
        const fallback = `<span>${escapeHtml(agentName.slice(0, 2).toUpperCase())}</span>`;
        return `
            <button class="lineup-agent-point" type="button" data-index="${lineupState.selectedLineup}"
                style="${pointStyle([left, start[1]])}" title="${escapeHtml(agentName)}">
                ${agentImage ? `<img src="${agentImage}" alt="${escapeHtml(agentName)}" loading="lazy" />` : fallback}
            </button>
        `;
    }).join('');
}

function toDisplayPoint(point) {
    const x = clampPercent(point?.[0]);
    const y = clampPercent(point?.[1]);
    return lineupState.side === 'defense' ? [100 - x, 100 - y] : [x, y];
}

function fromDisplayPoint(point) {
    const x = clampPercent(point?.[0]);
    const y = clampPercent(point?.[1]);
    return lineupState.side === 'defense' ? [100 - x, 100 - y] : [x, y];
}

function pointStyle(point) {
    const [left, top] = toDisplayPoint(point);
    return `left:${left}%;top:${top}%`;
}

function getLineupStartPoint(lineup) {
    if (Number.isFinite(Number(lineup?.left)) && Number.isFinite(Number(lineup?.top))) {
        return [clampPercent(lineup.left), clampPercent(lineup.top)];
    }
    const point = lineup?.points?.[0] || {};
    return [clampPercent(point.left), clampPercent(point.top)];
}

function getLineupPathPoints(lineup, target) {
    const start = getLineupStartPoint(lineup);
    const points = [start];
    (lineup?.points || []).forEach(point => {
        points.push([clampPercent(point.left), clampPercent(point.top)]);
    });

    const last = points[points.length - 1];
    if (!last || Math.abs(last[0] - target[0]) > 0.4 || Math.abs(last[1] - target[1]) > 0.4) {
        points.push(target);
    }

    return points;
}

function buildMapLabels(map) {
    const labels = mapCallouts[map?.id]?.[lineupState.side] || mapCallouts.abyss.attack;
    return labels.map(([text, left, top]) => ({
        type: lineupState.side,
        text,
        point: [clampPercent(left), clampPercent(top)]
    }));
}

function updateLineupStatus(lineups, message = '') {
    const status = document.getElementById('lineup-status');
    if (!status) return;

    if (message) {
        status.hidden = false;
        status.textContent = message;
        return;
    }

    if (lineupState.removingLineup) {
        status.hidden = false;
        status.textContent = Number.isInteger(lineupState.pendingRemovalIndex)
            ? 'Lineup selecionada para remocao. Clique em Confirmar Remocao.'
            : 'Modo remocao ativo. Clique na habilidade de uma lineup para selecionar.';
        return;
    }

    if (lineups.length) {
        status.hidden = true;
        status.textContent = '';
        return;
    }

    status.hidden = false;
    status.textContent = lineupState.lineupsReady
        ? 'Sem lineups cadastradas para este mapa, lado e agente.'
        : 'Carregando lineups cadastradas...';
}

function setupMapInteractions() {
    const map = document.getElementById('tactical-map');
    if (!map) return;

    map.addEventListener('wheel', event => {
        event.preventDefault();
        const delta = event.deltaY < 0 ? 0.16 : -0.16;
        setMapZoom(lineupState.zoom + delta, true);
    }, { passive: false });

    map.addEventListener('pointerdown', event => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if (event.target.closest('.map-zoom-controls')) return;
        if (lineupState.removingLineup && event.target.closest('.lineup-marker')) return;
        if (event.target.closest('.lineup-agent-point')) return;
        if (lineupState.creatingLineup && lineupState.pointMode) return;
        event.preventDefault();
        const marker = event.target.closest('.lineup-marker');
        lineupState.dragging = true;
        lineupState.dragMoved = false;
        lineupState.pendingMarkerIndex = marker ? Number(marker.dataset.index || 0) : null;
        lineupState.dragX = event.clientX;
        lineupState.dragY = event.clientY;
        lineupState.dragStartX = event.clientX;
        lineupState.dragStartY = event.clientY;
        map.classList.add('is-dragging');
        map.setPointerCapture(event.pointerId);
    });

    map.addEventListener('pointermove', event => {
        if (!lineupState.dragging) return;
        const deltaX = event.clientX - lineupState.dragX;
        const deltaY = event.clientY - lineupState.dragY;
        const totalX = event.clientX - lineupState.dragStartX;
        const totalY = event.clientY - lineupState.dragStartY;
        if (Math.hypot(totalX, totalY) > 4) lineupState.dragMoved = true;
        lineupState.panX += deltaX * 1.18;
        lineupState.panY += deltaY * 1.18;
        lineupState.dragX = event.clientX;
        lineupState.dragY = event.clientY;
        applyMapTransform();
    });

    map.addEventListener('pointerup', event => finishMapDrag(map, event));
    map.addEventListener('pointercancel', event => finishMapDrag(map, event));
    map.addEventListener('click', handleLineupPointClick);

    document.querySelectorAll('.map-zoom-controls button').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.zoom;
            if (action === 'reset') {
                resetMapTransform(true);
            } else {
                setMapZoom(lineupState.zoom + (action === 'in' ? 0.25 : -0.25), true);
            }
        });
    });

    window.addEventListener('resize', () => {
        updateMapLayerFrame();
        updateMapZoomLimit();
        setMapZoom(lineupState.zoom);
    });
}

function finishMapDrag(map, event) {
    if (!lineupState.dragging) return;
    if (lineupState.dragMoved) {
        lineupState.suppressMarkerClick = true;
        window.setTimeout(() => { lineupState.suppressMarkerClick = false; }, 0);
    } else if (!lineupState.removingLineup && Number.isInteger(lineupState.pendingMarkerIndex)) {
        const index = lineupState.pendingMarkerIndex;
        lineupState.suppressMarkerClick = true;
        lineupState.selectedLineup = lineupState.selectedLineup === index ? null : index;
        window.setTimeout(() => { lineupState.suppressMarkerClick = false; }, 0);
        renderLineupsTool();
    }
    lineupState.dragging = false;
    lineupState.dragMoved = false;
    lineupState.pendingMarkerIndex = null;
    map.classList.remove('is-dragging');
    if (event?.pointerId != null && map.hasPointerCapture(event.pointerId)) {
        map.releasePointerCapture(event.pointerId);
    }
}

function setMapZoom(value, playSound = false) {
    updateMapZoomLimit();
    const previousZoom = lineupState.zoom;
    lineupState.zoom = Math.min(lineupState.maxZoom, Math.max(1, value));
    if (playSound && Math.abs(lineupState.zoom - previousZoom) > 0.01) {
        window.valtrackSfx?.zoomTick(lineupState.zoom > previousZoom ? 1 : -1);
    }
    applyMapTransform();
}

function resetMapTransform(playSound = false) {
    const previousZoom = lineupState.zoom;
    lineupState.zoom = 1;
    lineupState.panX = 0;
    lineupState.panY = 0;
    if (playSound && previousZoom !== 1) window.valtrackSfx?.zoomTick(-1);
    applyMapTransform();
}

function updateMapZoomLimit() {
    const image = document.getElementById('tactical-map-img');
    if (image?.classList.contains('is-vector')) {
        lineupState.maxZoom = 3;
        return;
    }

    if (!image || !image.naturalWidth || !image.naturalHeight) {
        lineupState.maxZoom = 1.8;
        return;
    }

    const rect = image.getBoundingClientRect();
    const displayedSize = Math.min(rect.width / Math.max(lineupState.zoom, 1), rect.height / Math.max(lineupState.zoom, 1));
    const sourceSize = Math.max(image.naturalWidth, image.naturalHeight);
    const densityLimit = displayedSize > 0 ? sourceSize / displayedSize : 1.8;
    lineupState.maxZoom = Math.max(1.15, Math.min(2.15, densityLimit * 0.96));
}

function updateMapLayerFrame() {
    const map = document.getElementById('tactical-map');
    const layer = document.getElementById('map-zoom-layer');
    const image = document.getElementById('tactical-map-img');
    if (!map || !layer || !image) return;

    const rect = map.getBoundingClientRect();
    const imageWidth = image.naturalWidth || rect.width;
    const imageHeight = image.naturalHeight || rect.height;
    const sourceRatio = imageWidth > 0 && imageHeight > 0 ? imageWidth / imageHeight : 1;
    const ratio = sourceRatio > 0 ? 1 / sourceRatio : 1;

    let width = rect.width;
    let height = width / ratio;
    if (height > rect.height) {
        height = rect.height;
        width = height * ratio;
    }

    layer.style.width = `${width}px`;
    layer.style.height = `${height}px`;
    layer.style.left = `${(rect.width - width) / 2}px`;
    layer.style.top = `${(rect.height - height) / 2}px`;

    image.style.width = `${height}px`;
    image.style.height = `${width}px`;
    image.style.left = `${(width - height) / 2}px`;
    image.style.top = `${(height - width) / 2}px`;
    image.style.right = 'auto';
    image.style.bottom = 'auto';
    image.style.transform = `rotate(${lineupState.side === 'defense' ? 270 : 90}deg)`;
}

function applyMapTransform() {
    const layer = document.getElementById('map-zoom-layer');
    if (!layer) return;
    layer.style.transform = `translate(${lineupState.panX}px, ${lineupState.panY}px) scale(${lineupState.zoom})`;
}

function getYoutubeEmbedUrl(url) {
    const value = String(url || '').trim();
    if (!value) return '';
    try {
        const parsed = new URL(value);
        let videoId = '';
        if (parsed.hostname.includes('youtu.be')) {
            videoId = parsed.pathname.replace('/', '');
        } else if (parsed.hostname.includes('youtube.com')) {
            videoId = parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop() || '';
        }
        videoId = videoId.replace(/[^a-zA-Z0-9_-]/g, '');
        return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
    } catch {
        return '';
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

window.LinedUpLineups = {
    syncAdminControls: syncLineupAdminControls
};

document.addEventListener('DOMContentLoaded', initLineupsPage);
