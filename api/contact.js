// Kontaktní formulář Rezidence Padochov — odeslání rovnou na e-mail (bez mailto).
// Vercel Serverless Function (Node). Odesílá přes náš SMTP (mailcow, mail.gomatela.cz).
const nodemailer = require('nodemailer');

const MAIL_TO   = process.env.MAIL_TO   || 'reality@cermakhonza.cz';
const MAIL_FROM = process.env.MAIL_FROM || 'Web Rezidence Padochov <objednavky@suorigo.cz>';
const SITE_URL  = process.env.SITE_URL  || 'https://padochov-web.vercel.app';

const esc = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(raw); } catch { return {}; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  let data;
  try { data = await readBody(req); } catch { data = {}; }

  // Honeypot: když je vyplněný, tváříme se jako úspěch (bot).
  if (data.company) return res.status(200).json({ ok: true });

  const name  = String(data.name  || '').trim().slice(0, 200);
  const email = String(data.email || '').trim().slice(0, 200);
  const phone = String(data.phone || '').trim().slice(0, 60);
  const msg   = String(data.msg   || '').trim().slice(0, 5000);

  if (!name || !email) return res.status(400).json({ ok: false, error: 'missing_fields' });
  if (!isEmail(email))  return res.status(400).json({ ok: false, error: 'bad_email' });

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.gomatela.cz',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || '1') === '1' || Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 12000, greetingTimeout: 8000, socketTimeout: 20000,
  });

  const subject = `Nová poptávka z webu Rezidence Padochov: ${name}`;
  const text =
    `Nová nezávazná poptávka z webu Rezidence Padochov.\n\n` +
    `Jméno a příjmení: ${name}\nE-mail: ${email}\nTelefon: ${phone || 'neuvedeno'}\n\n` +
    `Zpráva:\n${msg || '(bez zprávy)'}\n`;
  const html =
    `<div style="font-family:'Segoe UI',Arial,sans-serif;color:#141414;line-height:1.5">` +
    `<h2 style="margin:0 0 12px;color:#141414">Nová poptávka z webu Rezidence Padochov</h2>` +
    `<table style="border-collapse:collapse;font-size:15px">` +
    `<tr><td style="padding:2px 14px 2px 0;color:#3f7d2f"><b>Jméno</b></td><td>${esc(name)}</td></tr>` +
    `<tr><td style="padding:2px 14px 2px 0;color:#3f7d2f"><b>E-mail</b></td><td><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>` +
    `<tr><td style="padding:2px 14px 2px 0;color:#3f7d2f"><b>Telefon</b></td><td>${esc(phone) || 'neuvedeno'}</td></tr>` +
    `</table>` +
    `<p style="margin:14px 0 4px;color:#3f7d2f"><b>Zpráva</b></p>` +
    `<p style="margin:0;white-space:pre-wrap">${esc(msg) || '(bez zprávy)'}</p>` +
    `<hr style="border:none;border-top:1px solid #e5e5e5;margin:18px 0"/>` +
    `<p style="font-size:12px;color:#888;margin:0">Odesláno z kontaktního formuláře na <a href="${esc(SITE_URL)}">${esc(SITE_URL.replace(/^https?:\/\//,''))}</a>. Odpovědí se ozvete přímo zájemci.</p>` +
    `</div>`;

  try {
    await transport.sendMail({
      from: MAIL_FROM,
      to: MAIL_TO,
      replyTo: `"${name.replace(/"/g, '')}" <${email}>`,
      subject,
      text,
      html,
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('contact send error:', e && e.message);
    return res.status(502).json({ ok: false, error: 'send_failed' });
  }
};
