// Backend minimal pour l'app RWFO, version Supabase (PostgreSQL).
// Variables d'environnement à définir sur l'hébergeur (Render) :
//   DATABASE_URL    (obligatoire) chaîne de connexion Supabase (voir les instructions)
//   ALLOWED_ORIGIN  (optionnel)   ex: https://tonpseudo.github.io  (défaut: *)
//   PORT            (fourni automatiquement par l'hébergeur)

const http = require('http');
const { URL } = require('url');
const { Pool } = require('pg');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const MAX_BODY = 20 * 1024 * 1024;

if (!process.env.DATABASE_URL) {
  console.error('ERREUR: la variable DATABASE_URL est manquante.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

const TECH_FIELDS = ['_id', 'messageId', 'commitSession', 'broadcast', 'created_at'];
const socketsBySub = new Map();

function safeStr(v) { return String(v || '').slice(0, 200); }
function cleanDoc(msg) { const d = { ...msg }; TECH_FIELDS.forEach(k => delete d[k]); return d; }
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// -------------------- HTTP --------------------
const server = http.createServer(async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url, 'http://localhost');

  try {
    if (url.pathname === '/' || url.pathname === '/health') return sendJson(res, 200, { ok: true });

    // Historique d'un participant
    if (req.method === 'GET' && url.pathname === '/app/api/session/list') {
      const subId = safeStr(url.searchParams.get('subId'));
      const context = safeStr(url.searchParams.get('context'));
      const fields = (url.searchParams.get('fields') || '').split(',').filter(f => /^[A-Za-z0-9_]+$/.test(f));
      const from = url.searchParams.get('from');

      const params = [subId, context];
      let sql = 'select id, created_at, data from sessions where sub_id=$1 and context=$2 and committed=true';
      if (from && !isNaN(new Date(from))) { params.push(new Date(from)); sql += ' and created_at > $3'; }
      sql += ' order by created_at asc';

      const { rows } = await pool.query(sql, params);
      const out = rows.map(r => {
        const doc = { _id: r.id, created_at: r.created_at, localSessionId: r.data.localSessionId, context, subId };
        fields.forEach(f => { if (f in r.data) doc[f] = r.data[f]; });
        return doc;
      });
      return sendJson(res, 200, out);
    }

    // Renvoi de données manquées
    if (req.method === 'POST' && url.pathname === '/app/api/session') {
      const subId = safeStr(url.searchParams.get('subId'));
      const context = safeStr(url.searchParams.get('context'));
      const body = JSON.parse((await readBody(req)) || '[]');
      const list = Array.isArray(body) ? body : [body];
      let nModified = 0, nInserted = 0;
      for (const item of list) {
        if (!item || !item.localSessionId) continue;
        const doc = cleanDoc(item); doc.subId = subId; doc.context = context;
        const found = await pool.query(
          "select id from sessions where sub_id=$1 and context=$2 and data->>'localSessionId'=$3 limit 1",
          [subId, context, String(item.localSessionId)]);
        if (found.rows.length) {
          await pool.query('update sessions set data = data || $1::jsonb, committed=true where id=$2',
            [JSON.stringify(doc), found.rows[0].id]);
          nModified++;
        } else {
          await pool.query('insert into sessions (sub_id, context, committed, data) values ($1,$2,true,$3::jsonb)',
            [subId, context, JSON.stringify(doc)]);
          nInserted++;
        }
      }
      return sendJson(res, 200, { nModified, nInserted });
    }

    sendJson(res, 404, { error: 'not found' });
  } catch (e) {
    console.error(e);
    sendJson(res, 500, { error: 'server error' });
  }
});

// -------------------- WEBSOCKET --------------------
const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_BODY });
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname !== '/app/session') { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
});

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const subId = safeStr(url.searchParams.get('subId'));
  const context = safeStr(url.searchParams.get('context'));
  const sName = safeStr(url.searchParams.get('sName'));
  const askedId = url.searchParams.get('sessionId');

  const key = subId + '|' + context;
  if (!socketsBySub.has(key)) socketsBySub.set(key, new Set());
  socketsBySub.get(key).add(ws);
  ws.on('close', () => socketsBySub.get(key)?.delete(ws));

  try {
    let id = null;
    if (askedId && UUID_RE.test(askedId)) {
      const r = await pool.query('select id from sessions where id=$1 and sub_id=$2 and context=$3', [askedId, subId, context]);
      if (r.rows.length) id = r.rows[0].id;
    }
    if (!id) {
      const r = await pool.query(
        'insert into sessions (sub_id, context, data) values ($1,$2,$3::jsonb) returning id',
        [subId, context, JSON.stringify({ sName })]);
      id = r.rows[0].id;
    }
    ws.send(JSON.stringify({ _id: id }));

    // File d'attente : les messages sont traités un par un, dans l'ordre.
    let chain = Promise.resolve();
    ws.on('message', raw => {
      chain = chain.then(async () => {
        try {
          const msg = JSON.parse(raw.toString());
          const doc = cleanDoc(msg); doc.subId = subId; doc.context = context;
          await pool.query(
            'update sessions set data = data || $1::jsonb, committed = (committed or $2) where id=$3',
            [JSON.stringify(doc), !!msg.commitSession, id]);
          if (msg.broadcast) {
            for (const other of socketsBySub.get(key) || [])
              if (other.readyState === 1) other.send(JSON.stringify({ broadcast: msg.broadcast }));
          }
          ws.send(JSON.stringify({ messageId: msg.messageId }));
        } catch (e) { console.error('Erreur message ws:', e.message); }
      });
    });
  } catch (e) {
    console.error('Erreur connexion ws:', e);
    ws.close();
  }
});

pool.query('select 1').then(() => {
  server.listen(PORT, () => console.log('Serveur démarré sur le port ' + PORT));
}).catch(e => { console.error('Connexion à la base impossible:', e.message); process.exit(1); });
