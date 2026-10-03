const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/subscribe', limiter);

const DATA_FILE = path.join(__dirname, 'data', 'subscriptions.json');

function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveData(arr) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
}

app.post('/subscribe', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const { phone, hp, ts } = req.body || {};

  if (hp && hp.trim() !== '') {
    return res.status(400).json({ error: 'spam detected' });
  }

  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ error: 'invalid phone' });
  }

  // simple bot timing check: if submitted too fast (<1s), reject
  if (ts && typeof ts === 'number') {
    if (Date.now() - ts < 1000) return res.status(400).json({ error: 'too fast' });
  }

  const pn = parsePhoneNumberFromString(phone);
  if (!pn || !pn.isValid()) {
    return res.status(400).json({ error: 'invalid phone' });
  }

  const e164 = pn.number;

  const all = loadData();
  if (all.find((s) => s.phone === e164)) {
    return res.status(200).json({ ok: true, message: 'already subscribed' });
  }

  const entry = { phone: e164, ip, createdAt: new Date().toISOString() };
  all.push(entry);
  try {
    saveData(all);
  } catch (e) {
    console.error('Failed to save subscription', e);
    return res.status(500).json({ error: 'server error' });
  }

  return res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Subscribe server listening on port ${PORT}`);
});
