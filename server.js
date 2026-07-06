const crypto = require('crypto');
const fs = require('fs/promises');
const http = require('http');
const path = require('path');
let nodemailer = null;

try {
  nodemailer = require('nodemailer');
} catch {
  nodemailer = null;
}

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'main', 'assets');
const DB_PATH = path.join(ROOT, 'db', 'db.json');
const VERIFICATION_CODE_TTL_MS = 1000 * 60 * 10;
const VERIFICATION_RESEND_COOLDOWN_MS = 1000 * 60;
const VERIFICATION_MAX_ATTEMPTS = 5;

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
  const { senha, verificationCodeHash, verificationToken, ...safeUser } = user;
  return {
    favoriteCrosshairIds: [],
    ...safeUser
  };
}

function adminUser(user) {
  if (!user) return null;
  return {
    favoriteCrosshairIds: [],
    ...user,
    verificationToken: undefined
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

function generateVerificationCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function hashVerificationCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function getMailConfig() {
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);

  if (!gmailUser || !gmailPass) return null;

  return {
    host,
    port,
    secure: port === 465,
    auth: {
      user: gmailUser,
      pass: gmailPass
    }
  };
}

async function sendVerificationEmail(pendingUser, code) {
  const mailConfig = getMailConfig();
  const from = process.env.SMTP_FROM || process.env.GMAIL_USER || process.env.SMTP_USER || 'LinedUp';
  const subject = 'Codigo de verificacao do LinedUp';
  const text = [
    `Seu codigo de verificacao do LinedUp e: ${code}`,
    '',
    'Ele expira em 10 minutos.',
    'Se voce nao tentou criar uma conta, ignore este email.'
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <h2>Confirme seu email no LinedUp</h2>
      <p>Use o codigo abaixo para ativar sua conta:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
      <p>Este codigo expira em 10 minutos.</p>
      <p>Se voce nao tentou criar uma conta, ignore este email.</p>
    </div>
  `;

  if (nodemailer && mailConfig) {
    const transporter = nodemailer.createTransport(mailConfig);
    await transporter.sendMail({
      from,
      to: pendingUser.email,
      subject,
      text,
      html
    });
  }

  console.log('\n[LinedUp] Codigo de confirmacao de email');
  console.log(`Para: ${pendingUser.email}`);
  console.log(`Codigo: ${code}`);
  console.log(nodemailer && mailConfig ? 'Status: enviado por SMTP\n' : 'Status: SMTP nao configurado; use este codigo em desenvolvimento\n');

  return Boolean(nodemailer && mailConfig);
}

function cleanupExpiredPendingUsers(db) {
  const now = Date.now();
  db.pendingUsers = db.pendingUsers.filter(user => {
    const expiresAt = Date.parse(user.expiresAt || '');
    return Number.isFinite(expiresAt) && expiresAt > now;
  });
}

async function handleAuth(req, res, url) {
  const db = await readDb();
  cleanupExpiredPendingUsers(db);
  let dbChanged = false;

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    const { login, senha } = await readBody(req);
    const credential = normalizeCredential(login);
    const user = db.users.find(item =>
      (normalizeCredential(item.login) === credential || normalizeCredential(item.email) === credential)
      && String(item.senha) === String(senha || '')
    );

    if (!user) return sendJson(res, 401, { error: 'Login ou senha invalidos.' });
    if (user.emailVerified === false) {
      return sendJson(res, 403, { error: 'Confirme seu email antes de entrar.' });
    }

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

    const loginTaken = db.users.some(user => normalizeCredential(user.login) === normalizeCredential(cleanLogin))
      || db.pendingUsers.some(user => normalizeCredential(user.login) === normalizeCredential(cleanLogin));
    const emailTaken = db.users.some(user => normalizeCredential(user.email) === cleanEmail)
      || db.pendingUsers.some(user => normalizeCredential(user.email) === cleanEmail);

    if (loginTaken) return sendJson(res, 409, { error: 'Este login ja esta em uso.' });
    if (emailTaken) return sendJson(res, 409, { error: 'Este email ja esta em uso ou aguardando confirmacao.' });

    const code = generateVerificationCode();
    const now = Date.now();
    const pendingUser = {
      id: crypto.randomUUID(),
      login: cleanLogin,
      email: cleanEmail,
      senha: cleanPassword,
      type: 'normal',
      favoriteCrosshairIds: [],
      verificationCodeHash: hashVerificationCode(code),
      verificationAttempts: 0,
      verificationSentAt: new Date(now).toISOString(),
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + VERIFICATION_CODE_TTL_MS).toISOString()
    };

    db.pendingUsers.push(pendingUser);
    await writeDb(db);
    const emailSent = await sendVerificationEmail(pendingUser, code);

    return sendJson(res, 202, {
      email: pendingUser.email,
      expiresInSeconds: Math.floor(VERIFICATION_CODE_TTL_MS / 1000),
      resendAfterSeconds: Math.floor(VERIFICATION_RESEND_COOLDOWN_MS / 1000),
      message: emailSent
        ? 'Enviamos um codigo de verificacao para seu email.'
        : 'Codigo gerado. SMTP nao configurado, confira o terminal do servidor.'
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/verify-code') {
    const { email, code } = await readBody(req);
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanCode = String(code || '').trim();
    const pendingUser = db.pendingUsers.find(user => normalizeCredential(user.email) === cleanEmail);

    if (!pendingUser) return sendJson(res, 404, { error: 'Cadastro pendente nao encontrado.' });

    const expiresAt = Date.parse(pendingUser.expiresAt || '');
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      db.pendingUsers = db.pendingUsers.filter(item => item.id !== pendingUser.id);
      await writeDb(db);
      return sendJson(res, 410, { error: 'Codigo expirado. Faca o cadastro novamente.' });
    }

    if ((Number(pendingUser.verificationAttempts) || 0) >= VERIFICATION_MAX_ATTEMPTS) {
      return sendJson(res, 429, { error: 'Muitas tentativas. Reenvie o codigo para tentar novamente.' });
    }

    if (!/^\d{6}$/.test(cleanCode) || pendingUser.verificationCodeHash !== hashVerificationCode(cleanCode)) {
      pendingUser.verificationAttempts = (Number(pendingUser.verificationAttempts) || 0) + 1;
      await writeDb(db);
      const remainingAttempts = Math.max(0, VERIFICATION_MAX_ATTEMPTS - pendingUser.verificationAttempts);
      return sendJson(res, 400, { error: `Codigo invalido. Tentativas restantes: ${remainingAttempts}.` });
    }

    const user = {
      id: nextNumericId(db.users),
      login: pendingUser.login,
      email: pendingUser.email,
      senha: pendingUser.senha,
      type: pendingUser.type || 'normal',
      favoriteCrosshairIds: pendingUser.favoriteCrosshairIds || [],
      emailVerified: true,
      createdAt: new Date().toISOString()
    };

    db.users.push(user);
    db.pendingUsers = db.pendingUsers.filter(item => item.id !== pendingUser.id);
    await writeDb(db);
    return sendJson(res, 201, { user: publicUser(user), message: 'Email confirmado. Conta criada com sucesso.' });
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/resend-code') {
    const { email } = await readBody(req);
    const cleanEmail = String(email || '').trim().toLowerCase();
    const pendingUser = db.pendingUsers.find(user => normalizeCredential(user.email) === cleanEmail);

    if (!pendingUser) return sendJson(res, 404, { error: 'Cadastro pendente nao encontrado.' });

    const sentAt = Date.parse(pendingUser.verificationSentAt || pendingUser.createdAt || '');
    const elapsed = Number.isFinite(sentAt) ? Date.now() - sentAt : VERIFICATION_RESEND_COOLDOWN_MS;
    if (elapsed < VERIFICATION_RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((VERIFICATION_RESEND_COOLDOWN_MS - elapsed) / 1000);
      return sendJson(res, 429, { error: `Aguarde ${wait}s para reenviar o codigo.`, resendAfterSeconds: wait });
    }

    const code = generateVerificationCode();
    const now = Date.now();
    pendingUser.verificationCodeHash = hashVerificationCode(code);
    pendingUser.verificationAttempts = 0;
    pendingUser.verificationSentAt = new Date(now).toISOString();
    pendingUser.expiresAt = new Date(now + VERIFICATION_CODE_TTL_MS).toISOString();
    await writeDb(db);

    const emailSent = await sendVerificationEmail(pendingUser, code);
    return sendJson(res, 200, {
      expiresInSeconds: Math.floor(VERIFICATION_CODE_TTL_MS / 1000),
      resendAfterSeconds: Math.floor(VERIFICATION_RESEND_COOLDOWN_MS / 1000),
      message: emailSent ? 'Codigo reenviado para seu email.' : 'Novo codigo gerado. Confira o terminal do servidor.'
    });
  }

  if (dbChanged) await writeDb(db);
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
      emailVerified: true,
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
    if (payload.emailVerified !== undefined) user.emailVerified = Boolean(payload.emailVerified);

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
  return sendJson(res, 501, { error: 'Use o fallback do navegador para consultar a Henrik API.' });
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
  console.log('Codigos de confirmacao aparecem aqui quando SMTP nao estiver configurado.');
  console.log('Gmail SMTP: configure GMAIL_USER e GMAIL_APP_PASSWORD antes de iniciar o servidor.');
});
