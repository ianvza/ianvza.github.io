/* LinedUp - Riot Valorant tracker */

const HENRIK_API_BASE = 'https://api.henrikdev.xyz';
const HENRIK_API_KEY_STORAGE = 'HENRIK_API_KEY';

function parseRiotId(raw) {
    const parts = raw.trim().split('#');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    return { name: parts[0], tag: parts[1] };
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function timeAgo(ms) {
    if (!ms) return '-';
    const s = Math.floor((Date.now() - ms) / 1000);
    if (s < 60) return `${s}s atras`;
    if (s < 3600) return `${Math.floor(s / 60)}min atras`;
    if (s < 86400) return `${Math.floor(s / 3600)}h atras`;
    return `${Math.floor(s / 86400)}d atras`;
}

function showToast(msg, duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => { t.classList.add('hide'); setTimeout(() => t.remove(), 280); }, duration);
}

function setLoading(msg = 'Buscando dados...') {
    document.getElementById('results-section').style.display = 'none';
    document.getElementById('error-state').style.display = 'none';
    document.getElementById('loading-state').style.display = 'block';
    document.getElementById('loading-msg').textContent = msg;
}

function setError(msg) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'block';
    document.getElementById('error-msg').textContent = msg;
}

function setResults() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'none';
    document.getElementById('results-section').style.display = 'flex';
}

async function fetchPlayerSummary(parsed, region) {
    try {
        const response = await fetch('/api/player-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: parsed.name,
                tag: parsed.tag,
                region
            })
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok) return data;
    } catch (error) {
        // Continue with the Henrik fallback when the local API route is not available.
    }

    return fetchHenrikPlayerSummary(parsed, region);
}

function getHenrikApiKey() {
    return String(window.HENRIK_API_KEY || localStorage.getItem(HENRIK_API_KEY_STORAGE) || '').trim();
}

async function fetchHenrikJson(path) {
    const key = getHenrikApiKey();
    if (!key) {
        throw new Error('Configure HENRIK_API_KEY para buscar dados reais de jogadores.');
    }

    const response = await fetch(`${HENRIK_API_BASE}${path}`, {
        headers: {
            Authorization: key,
            Accept: 'application/json'
        }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.status >= 400) {
        throw new Error(data.errors?.[0]?.message || data.error || `Erro Henrik API ${response.status}`);
    }
    return data.data ?? data;
}

async function fetchHenrikPlayerSummary(parsed, region) {
    const safeName = encodeURIComponent(parsed.name);
    const safeTag = encodeURIComponent(parsed.tag);
    const safeRegion = encodeURIComponent(region);
    const [mmr, matches] = await Promise.all([
        fetchHenrikJson(`/valorant/v2/mmr/${safeRegion}/${safeName}/${safeTag}`),
        fetchHenrikJson(`/valorant/v3/matches/${safeRegion}/${safeName}/${safeTag}?mode=competitive&size=10`)
    ]);

    return normalizeHenrikSummary(parsed, mmr, Array.isArray(matches) ? matches : []);
}

function normalizeHenrikSummary(parsed, mmr, matches) {
    const players = matches
        .map(match => findPlayerInMatch(match, parsed))
        .filter(Boolean);
    const firstPlayer = players[0] || {};
    const totals = players.reduce((acc, player) => {
        const stats = player.stats || {};
        acc.kills += Number(stats.kills || 0);
        acc.deaths += Number(stats.deaths || 0);
        acc.assists += Number(stats.assists || 0);
        return acc;
    }, { kills: 0, deaths: 0, assists: 0 });

    const normalizedMatches = matches.map(match => normalizeHenrikMatch(match, parsed)).filter(Boolean);
    const wins = normalizedMatches.filter(match => match.result === 'win').length;
    const totalGames = normalizedMatches.length;
    const currentData = mmr.current_data || {};
    const highestRank = mmr.highest_rank || {};

    return {
        profile: {
            name: mmr.name || parsed.name,
            tag: mmr.tag || parsed.tag,
            level: firstPlayer.level || null,
            card: firstPlayer.assets?.card?.small || firstPlayer.assets?.card?.large || ''
        },
        stats: {
            rank: currentData.currenttier_patched || 'Unrated',
            rr: currentData.ranking_in_tier ?? null,
            rankIcon: currentData.images?.large || currentData.images?.small || '',
            rankColor: '#FF4655',
            peakRank: highestRank.patched_tier || highestRank.tier || currentData.currenttier_patched || 'N/A',
            totalGames,
            wins,
            winrate: totalGames ? Math.round((wins / totalGames) * 100) : 0,
            totalKills: totals.kills,
            totalDeaths: totals.deaths,
            totalAssists: totals.assists,
            kd: totals.deaths ? (totals.kills / totals.deaths).toFixed(2) : totals.kills.toFixed(2),
            agents: buildAgentStats(players, normalizedMatches),
            weapons: []
        },
        matches: normalizedMatches
    };
}

function findPlayerInMatch(match, parsed) {
    const allPlayers = match?.players?.all_players || [];
    return allPlayers.find(player => (
        String(player.name || '').toLowerCase() === parsed.name.toLowerCase()
        && String(player.tag || '').toLowerCase() === parsed.tag.toLowerCase()
    ));
}

function normalizeHenrikMatch(match, parsed) {
    const player = findPlayerInMatch(match, parsed);
    if (!player) return null;
    const teams = match.teams || {};
    const teamKey = String(player.team || '').toLowerCase();
    const playerTeam = teams[teamKey] || {};
    const enemyTeam = teams[teamKey === 'red' ? 'blue' : 'red'] || {};
    const won = Boolean(playerTeam.has_won ?? playerTeam.won);
    const stats = player.stats || {};

    return {
        map: match.metadata?.map || 'Mapa',
        mode: match.metadata?.mode || match.metadata?.queue || 'Competitive',
        agent: player.character || 'Agente',
        agentIcon: player.assets?.agent?.small || player.assets?.agent?.full || '',
        result: won ? 'win' : 'loss',
        resultLabel: won ? 'Vitoria' : 'Derrota',
        score: {
            us: playerTeam.rounds_won ?? playerTeam.rounds_won_display ?? 0,
            them: enemyTeam.rounds_won ?? enemyTeam.rounds_won_display ?? 0
        },
        kda: {
            kills: Number(stats.kills || 0),
            deaths: Number(stats.deaths || 0),
            assists: Number(stats.assists || 0)
        },
        rank: player.currenttier_patched || 'Unrated',
        startedAt: Number(match.metadata?.game_start || 0) * 1000
    };
}

function buildAgentStats(players, matches) {
    const byAgent = new Map();
    players.forEach((player, index) => {
        const name = player.character || 'Agente';
        const current = byAgent.get(name) || {
            name,
            icon: player.assets?.agent?.small || player.assets?.agent?.full || '',
            games: 0,
            wins: 0,
            kills: 0,
            deaths: 0
        };
        current.games += 1;
        current.wins += matches[index]?.result === 'win' ? 1 : 0;
        current.kills += Number(player.stats?.kills || 0);
        current.deaths += Number(player.stats?.deaths || 0);
        byAgent.set(name, current);
    });

    return [...byAgent.values()]
        .map(agent => ({
            ...agent,
            kd: agent.deaths ? (agent.kills / agent.deaths).toFixed(2) : agent.kills.toFixed(2),
            winrate: agent.games ? Math.round((agent.wins / agent.games) * 100) : 0
        }))
        .sort((a, b) => b.games - a.games);
}

async function searchPlayer() {
    if (!window.LinedUpAuth?.requireLogin?.('Entre com uma conta para pesquisar jogadores.')) return;

    const raw = document.getElementById('riot-id-input').value;
    const region = document.getElementById('region-select').value;

    if (!raw.trim()) { showToast('Digite o Riot ID (ex: Player#BR1)'); return; }
    const parsed = parseRiotId(raw);
    if (!parsed) { showToast('Formato invalido. Use Nome#TAG'); return; }

    setLoading('Buscando dados atuais do jogador...');

    try {
        const summary = await fetchPlayerSummary(parsed, region);
        setLoading('Processando rank e partidas recentes...');

        renderProfile(summary.profile, summary.stats);
        renderRank(summary.stats);
        renderGeneral(summary.stats);
        renderAgents(summary.stats);
        renderWeapons(summary.stats);
        renderMatches(summary.matches || []);
        setResults();
    } catch (e) {
        console.error(e);
        setError(e.message || 'Erro ao buscar jogador. Verifique Riot ID e regiao.');
    }
}

function renderProfile(profile, stats) {
    const name = escapeHtml(profile.name);
    const tag = escapeHtml(profile.tag);
    const initials = name.slice(0, 2).toUpperCase() || 'VT';
    const avatar = profile.card
        ? `<img src="${escapeHtml(profile.card)}" alt="${name}" loading="lazy" />`
        : initials;
    document.getElementById('profile-header').innerHTML = `
    <div class="profile-avatar">${avatar}</div>
    <div>
      <div class="profile-name">${name}<span class="profile-tag"> #${tag}</span></div>
      <div style="margin-top:6px; display:flex; gap:8px; flex-wrap:wrap;">
        <span class="rank-badge">${stats.totalGames} partidas analisadas</span>
        <span class="rank-badge">${stats.wins} vitorias</span>
        ${profile.level ? `<span class="rank-badge">Level ${profile.level}</span>` : ''}
      </div>
    </div>
    <div class="profile-peak">
      <div class="peak-label">Peak recente</div>
      <div class="peak-value">${escapeHtml(stats.peakRank || 'N/A')}</div>
    </div>
  `;
}

function renderRank(stats) {
    const rank = escapeHtml(stats.rank || 'Unrated');
    const rrLabel = stats.rr == null ? 'RR indisponivel' : `${stats.rr} RR`;
    const icon = stats.rankIcon
        ? `<img src="${escapeHtml(stats.rankIcon)}" alt="${rank}" loading="lazy" />`
        : `<svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <circle cx="30" cy="30" r="28" stroke="${escapeHtml(stats.rankColor || '#888')}" stroke-width="2" fill="rgba(0,0,0,0.3)"/>
            <text x="30" y="36" text-anchor="middle" font-size="18" fill="${escapeHtml(stats.rankColor || '#888')}" font-weight="bold">R</text>
          </svg>`;
    document.getElementById('rank-content').innerHTML = `
    <div class="rank-icon-wrap">
      ${icon}
    </div>
    <div class="rank-name">${rank}</div>
    <div class="rank-rr">${rrLabel}</div>
    <div style="font-size:0.72rem;color:var(--text-3);margin-top:4px;text-align:center;">
      Dados atuais via tracker externo
    </div>
  `;
}

function renderGeneral(stats) {
    const kdClass = parseFloat(stats.kd) >= 1.2 ? 'good' : parseFloat(stats.kd) >= 0.8 ? '' : 'bad';
    const wrClass = stats.winrate >= 55 ? 'good' : stats.winrate >= 45 ? '' : 'bad';
    document.getElementById('general-content').innerHTML = `
    <div class="stat-block">
      <div class="lbl">K/D Ratio</div>
      <div class="val ${kdClass}">${escapeHtml(stats.kd)}</div>
    </div>
    <div class="stat-block">
      <div class="lbl">Winrate</div>
      <div class="val ${wrClass}">${stats.winrate}%</div>
    </div>
    <div class="stat-block">
      <div class="lbl">Partidas</div>
      <div class="val">${stats.totalGames}</div>
    </div>
    <div class="stat-block">
      <div class="lbl">Kills</div>
      <div class="val">${stats.totalKills}</div>
    </div>
    <div class="stat-block">
      <div class="lbl">Deaths</div>
      <div class="val">${stats.totalDeaths}</div>
    </div>
    <div class="stat-block">
      <div class="lbl">Assists</div>
      <div class="val">${stats.totalAssists}</div>
    </div>
  `;
}

function renderAgents(stats) {
    if (!stats.agents.length) {
        document.getElementById('agents-content').innerHTML = '<p style="color:var(--text-3);font-size:0.9rem;">Nenhum dado de agente disponivel.</p>';
        return;
    }
    const header = `
    <div class="agent-row" style="opacity:0.5;font-size:0.68rem;color:var(--text-3);padding:4px 14px;">
      <span>Agente</span><span></span>
      <div class="agent-stat"><span class="albl">Partidas</span></div>
      <div class="agent-stat"><span class="albl">K/D</span></div>
      <div class="agent-stat"><span class="albl">Winrate</span></div>
      <div class="agent-stat"><span class="albl">Wins</span></div>
    </div>`;
    const rows = stats.agents.map(a => `
    <div class="agent-row">
      <div class="agent-info">
        <div class="agent-icon">
          ${a.icon
            ? `<img src="${escapeHtml(a.icon)}" alt="${escapeHtml(a.name)}" loading="lazy" />`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.5">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>`}
        </div>
        <div>
          <div class="agent-name">${escapeHtml(a.name)}</div>
          <div class="agent-role">Valorant</div>
        </div>
      </div>
      <div class="winbar-wrap"><div class="winbar-fill" style="width:${a.winrate}%"></div></div>
      <div class="agent-stat"><div class="aval">${a.games}</div></div>
      <div class="agent-stat"><div class="aval">${escapeHtml(a.kd)}</div></div>
      <div class="agent-stat"><div class="aval">${a.winrate}%</div></div>
      <div class="agent-stat"><div class="aval">${a.wins}</div></div>
    </div>`).join('');
    document.getElementById('agents-content').innerHTML = header + rows;
}

function renderWeapons(stats) {
    if (!stats.weapons.length) {
        document.getElementById('weapons-content').innerHTML = '<p style="color:var(--text-3);font-size:0.9rem;">Nenhum abate com arma encontrado nas partidas analisadas.</p>';
        return;
    }
    const rows = stats.weapons.map(w => `
    <div class="weapon-row">
      <div class="weapon-name">${escapeHtml(w.name)}</div>
      <div></div>
      <div class="weapon-stat"><div class="wlbl">Kills</div><div class="wval">${w.kills}</div></div>
      <div class="weapon-stat"><div class="wlbl">Partidas</div><div class="wval">${w.games}</div></div>
      <div class="weapon-stat"><div class="wlbl">K/Jogo</div><div class="wval">${w.games ? (w.kills / w.games).toFixed(1) : '0.0'}</div></div>
    </div>`).join('');
    document.getElementById('weapons-content').innerHTML = rows;
}

function renderMatches(matches) {
    if (!matches.length) {
        document.getElementById('matches-content').innerHTML = '<p style="color:var(--text-3);font-size:0.9rem;">Nenhuma partida encontrada para esta chave/regiao.</p>';
        return;
    }
    const rows = matches.map(match => `
      <div class="match-row ${match.result}">
        <div>
          <div class="match-map">${escapeHtml(match.map)}</div>
          <div class="match-mode">${escapeHtml(match.mode)}</div>
        </div>
        <div class="match-agent">
          ${match.agentIcon
            ? `<img src="${escapeHtml(match.agentIcon)}" alt="${escapeHtml(match.agent)}" loading="lazy" />`
            : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.5">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>`}
          <span style="font-size:0.82rem;color:var(--text-2)">${escapeHtml(match.agent)}</span>
        </div>
        <div class="match-score-label ${match.result}">${escapeHtml(match.score.us)} - ${escapeHtml(match.score.them)}<br><span style="font-size:0.72rem">${escapeHtml(match.resultLabel)}</span></div>
        <div class="match-kda">
          <div class="kda-val">${match.kda.kills}/${match.kda.deaths}/${match.kda.assists}</div>
          <div class="kda-lbl">${escapeHtml(match.rank || 'Unrated')}</div>
        </div>
        <div class="match-date">${timeAgo(match.startedAt)}</div>
      </div>`).join('');
    document.getElementById('matches-content').innerHTML = rows;
}

function initTrackerPage() {
    const input = document.getElementById('riot-id-input');
    if (!input || input.dataset.bound === 'true') return;
    input.dataset.bound = 'true';
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') searchPlayer();
    });
}

document.addEventListener('DOMContentLoaded', initTrackerPage);
