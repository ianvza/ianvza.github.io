const fs = require('fs/promises');
const http = require('http');
const https = require('https');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'main', 'assets');
const DB_PATH = path.join(ROOT, 'db', 'db.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function setCorsHeaders(req, res) {
  const allowedOrigins = String(process.env.CORS_ORIGIN || 'https://ianvza.github.io,http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-LinedUp-User-Id');
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, status, text, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(text);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

async function readDb() {
  const content = await fs.readFile(DB_PATH, 'utf8');
  const db = JSON.parse(content);
  db.crosshairs ||= [];
  db.users ||= [];
  db.pendingUsers ||= [];
  db.lineups ||= [];
  return db;
}

async function writeDb(db) {
  await fs.writeFile(DB_PATH, `${JSON.stringify(db, null, 2)}\n`, 'utf8');
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw || '{}');
}

function publicUser(user) {
  if (!user) return null;
  const { senha, ...safeUser } = user;
  return {
    favoriteCrosshairIds: [],
    ...safeUser
  };
}

function adminUser(user) {
  if (!user) return null;
  return {
    favoriteCrosshairIds: [],
    ...user
  };
}

function nextNumericId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function normalizeCredential(value) {
  return String(value || '').trim().toLowerCase();
}

function findUserById(db, id) {
  return db.users.find(user => String(user.id) === String(id));
}

function isAdmin(req, db) {
  const user = findUserById(db, req.headers['x-linedup-user-id']);
  return user?.type === 'admin';
}

async function handleAuth(req, res, url) {
  const db = await readDb();

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    const { login, senha } = await readBody(req);
    const credential = normalizeCredential(login);
    const user = db.users.find(item =>
      (normalizeCredential(item.login) === credential || normalizeCredential(item.email) === credential)
      && String(item.senha) === String(senha || '')
    );

    if (!user) return sendJson(res, 401, { error: 'Login ou senha invalidos.' });

    return sendJson(res, 200, { user: publicUser(user) });
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/register') {
    const { login, email, senha } = await readBody(req);
    const cleanLogin = String(login || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(senha || '').trim();

    if (!cleanLogin || !cleanEmail || !cleanPassword) {
      return sendJson(res, 400, { error: 'Preencha login, email e senha.' });
    }

    const loginTaken = db.users.some(user => normalizeCredential(user.login) === normalizeCredential(cleanLogin));
    const emailTaken = db.users.some(user => normalizeCredential(user.email) === cleanEmail);

    if (loginTaken) return sendJson(res, 409, { error: 'Este login ja esta em uso.' });
    if (emailTaken) return sendJson(res, 409, { error: 'Este email ja esta em uso.' });

    const user = {
      id: nextNumericId(db.users),
      login: cleanLogin,
      email: cleanEmail,
      senha: cleanPassword,
      type: 'normal',
      favoriteCrosshairIds: [],
      createdAt: new Date().toISOString()
    };

    db.users.push(user);
    await writeDb(db);
    return sendJson(res, 201, { user: publicUser(user) });
  }

  return false;
}

async function handleUsers(req, res, url) {
  const db = await readDb();
  if (!isAdmin(req, db)) return sendJson(res, 403, { error: 'Apenas administradores podem gerenciar usuarios.' });

  if (req.method === 'GET' && url.pathname === '/api/users') {
    return sendJson(res, 200, { users: db.users.map(adminUser) });
  }

  if (req.method === 'POST' && url.pathname === '/api/users') {
    const payload = await readBody(req);
    if (!payload.login || !payload.email || !payload.senha) {
      return sendJson(res, 400, { error: 'Preencha login, email e senha.' });
    }

    const user = {
      id: nextNumericId(db.users),
      login: String(payload.login).trim(),
      email: String(payload.email).trim().toLowerCase(),
      senha: String(payload.senha).trim(),
      type: payload.type === 'admin' ? 'admin' : 'normal',
      favoriteCrosshairIds: [],
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    await writeDb(db);
    return sendJson(res, 201, { user: publicUser(user) });
  }

  const userMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch && req.method === 'PUT') {
    const user = findUserById(db, userMatch[1]);
    if (!user) return sendJson(res, 404, { error: 'Usuario nao encontrado.' });

    const payload = await readBody(req);
    if (payload.login !== undefined) user.login = String(payload.login).trim();
    if (payload.email !== undefined) user.email = String(payload.email).trim().toLowerCase();
    if (payload.senha !== undefined) user.senha = String(payload.senha).trim();
    if (payload.type !== undefined) user.type = payload.type === 'admin' ? 'admin' : 'normal';

    await writeDb(db);
    return sendJson(res, 200, { user: publicUser(user) });
  }

  if (userMatch && req.method === 'DELETE') {
    const before = db.users.length;
    db.users = db.users.filter(user => String(user.id) !== String(userMatch[1]));
    if (db.users.length === before) return sendJson(res, 404, { error: 'Usuario nao encontrado.' });
    await writeDb(db);
    return sendJson(res, 200, { ok: true });
  }

  return false;
}

async function handleFavorites(req, res, url) {
  if (req.method !== 'POST' || url.pathname !== '/api/favorites') return false;

  const db = await readDb();
  const user = findUserById(db, req.headers['x-linedup-user-id']);
  if (!user) return sendJson(res, 401, { error: 'Entre com uma conta para favoritar.' });

  const { crosshairId, favorite } = await readBody(req);
  const id = Number(crosshairId);
  user.favoriteCrosshairIds ||= [];
  const ids = new Set(user.favoriteCrosshairIds.map(Number));
  if (favorite) ids.add(id);
  else ids.delete(id);
  user.favoriteCrosshairIds = [...ids].filter(Number.isFinite);

  await writeDb(db);
  return sendJson(res, 200, { user: publicUser(user) });
}

async function handleCollection(req, res, url, collectionName) {
  const db = await readDb();
  const basePath = `/${collectionName}`;

  if (req.method === 'GET' && url.pathname === basePath) {
    return sendJson(res, 200, db[collectionName] || []);
  }

  if (req.method === 'POST' && url.pathname === basePath) {
    const item = await readBody(req);
    const saved = {
      ...item,
      id: item.id || nextNumericId(db[collectionName] || [])
    };
    db[collectionName] ||= [];
    db[collectionName].push(saved);
    await writeDb(db);
    return sendJson(res, 201, saved);
  }

  const match = url.pathname.match(new RegExp(`^/${collectionName}/([^/]+)$`));
  if (match && req.method === 'DELETE') {
    db[collectionName] ||= [];
    const before = db[collectionName].length;
    db[collectionName] = db[collectionName].filter(item => String(item.id) !== String(match[1]));
    if (db[collectionName].length === before) return sendJson(res, 404, { error: 'Item nao encontrado.' });
    await writeDb(db);
    return sendJson(res, 200, { ok: true });
  }

  return false;
}

async function handlePlayerSummary(req, res, url) {
  if (req.method !== 'POST' || url.pathname !== '/api/player-summary') return false;
  const apiKey = String(process.env.HENRIK_API_KEY || '').trim();
  if (!apiKey) return sendJson(res, 501, { error: 'Configure HENRIK_API_KEY no servidor.' });

  const payload = await readBody(req);
  const parsed = {
    name: String(payload.name || '').trim(),
    tag: String(payload.tag || '').trim()
  };
  const region = encodeURIComponent(String(payload.region || 'br').trim());
  const name = encodeURIComponent(parsed.name);
  const tag = encodeURIComponent(parsed.tag);
  const matchLimit = normalizeMatchLimit(payload.matchLimit);

  if (!parsed.name || !parsed.tag) return sendJson(res, 400, { error: 'Informe name e tag.' });

  try {
    const [mmr, matches, rankHistory] = await Promise.all([
      henrikJson(`/valorant/v2/mmr/${region}/${name}/${tag}`, apiKey),
      henrikJson(`/valorant/v3/matches/${region}/${name}/${tag}?mode=competitive&size=${matchLimit}`, apiKey),
      henrikJson(`/valorant/v1/mmr-history/${region}/${name}/${tag}`, apiKey).catch(() => [])
    ]);

    return sendJson(res, 200, normalizePlayerSummary(parsed, mmr, Array.isArray(matches) ? matches : [], Array.isArray(rankHistory) ? rankHistory : []));
  } catch (error) {
    return sendJson(res, 502, { error: error.message || 'Erro ao consultar Henrik API.' });
  }
}

function normalizeMatchLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(100, Math.max(10, Math.round(parsed)));
}

function henrikJson(pathname, apiKey) {
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: 'api.henrikdev.xyz',
      path: pathname,
      method: 'GET',
      headers: {
        Authorization: apiKey,
        Accept: 'application/json'
      }
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        const payload = JSON.parse(raw || '{}');
        if (response.statusCode >= 400 || payload.status >= 400) {
          reject(new Error(payload.errors?.[0]?.message || payload.error || `Erro Henrik API ${response.statusCode}`));
          return;
        }
        resolve(payload.data ?? payload);
      });
    });

    request.on('error', reject);
    request.end();
  });
}

function normalizePlayerSummary(parsed, mmr, matches, rankHistory) {
  const players = matches
    .map(match => findMatchPlayer(match, parsed))
    .filter(Boolean);
  const normalizedMatches = matches.map(match => normalizeServerMatch(match, parsed)).filter(Boolean);
  const firstPlayer = players[0] || {};
  const totals = players.reduce((acc, player) => {
    const stats = player.stats || {};
    acc.kills += Number(stats.kills || 0);
    acc.deaths += Number(stats.deaths || 0);
    acc.assists += Number(stats.assists || 0);
    return acc;
  }, { kills: 0, deaths: 0, assists: 0 });
  const currentData = mmr.current_data || {};
  const highestRank = mmr.highest_rank || {};
  const wins = normalizedMatches.filter(match => match.result === 'win').length;

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
      totalGames: normalizedMatches.length,
      wins,
      winrate: normalizedMatches.length ? Math.round((wins / normalizedMatches.length) * 100) : 0,
      totalKills: totals.kills,
      totalDeaths: totals.deaths,
      totalAssists: totals.assists,
      kd: totals.deaths ? (totals.kills / totals.deaths).toFixed(2) : totals.kills.toFixed(2),
      rankHistory: normalizeServerRankHistory(rankHistory),
      agents: buildServerAgentStats(players, normalizedMatches),
      weapons: []
    },
    matches: normalizedMatches
  };
}

function findMatchPlayer(match, parsed) {
  const allPlayers = match?.players?.all_players || [];
  return allPlayers.find(player => (
    String(player.name || '').toLowerCase() === parsed.name.toLowerCase()
    && String(player.tag || '').toLowerCase() === parsed.tag.toLowerCase()
  ));
}

function normalizeServerMatch(match, parsed) {
  const player = findMatchPlayer(match, parsed);
  if (!player) return null;
  const teams = match.teams || {};
  const teamKey = String(player.team || '').toLowerCase();
  const playerTeam = teams[teamKey] || {};
  const enemyTeam = teams[teamKey === 'red' ? 'blue' : 'red'] || {};
  const stats = player.stats || {};

  return {
    map: match.metadata?.map || 'Mapa',
    mode: match.metadata?.mode || match.metadata?.queue || 'Competitive',
    agent: player.character || 'Agente',
    agentIcon: player.assets?.agent?.small || player.assets?.agent?.full || '',
    result: Boolean(playerTeam.has_won ?? playerTeam.won) ? 'win' : 'loss',
    resultLabel: Boolean(playerTeam.has_won ?? playerTeam.won) ? 'Vitoria' : 'Derrota',
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

function normalizeServerRankHistory(history) {
  return history
    .map(entry => ({
      rank: entry.currenttierpatched || entry.currenttier_patched || entry.patched_tier || entry.tier_patched || entry.rank || 'Unrated',
      rr: entry.ranking_in_tier ?? entry.elo_change_to_last_game ?? null
    }))
    .filter(entry => entry.rank && entry.rank !== 'Unrated')
    .slice(0, 8);
}

function buildServerAgentStats(players, matches) {
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

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';

  const filePath = path.resolve(PUBLIC_DIR, `.${pathname}`);
  if (!filePath.startsWith(PUBLIC_DIR)) return sendText(res, 403, 'Forbidden');

  try {
    const content = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(content);
  } catch {
    sendText(res, 404, 'Not found');
  }
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (url.pathname.startsWith('/api/auth/') && await handleAuth(req, res, url) !== false) return;
    if (url.pathname.startsWith('/api/users') && await handleUsers(req, res, url) !== false) return;
    if (await handleFavorites(req, res, url) !== false) return;
    if (await handleCollection(req, res, url, 'crosshairs') !== false) return;
    if (await handleCollection(req, res, url, 'lineups') !== false) return;
    if (await handlePlayerSummary(req, res, url) !== false) return;

    if (url.pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'Rota nao encontrada.' });
    return serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: 'Erro interno do servidor.' });
  }
}

http.createServer(route).listen(PORT, () => {
  console.log(`LinedUp rodando em http://localhost:${PORT}`);
});
