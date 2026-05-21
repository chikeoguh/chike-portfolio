const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  /* ── only accept POST ── */
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { name, email, type, subject, message } = req.body || {};

  /* ── validate ── */
  if (!name?.trim() || !email?.trim() || !type?.trim() || !subject?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  const label = type.replace(/_/g, ' ');
  const ts    = new Date().toUTCString();

  try {
    /* ── 1. notify Chike ── */
    await resend.emails.send({
      from:    'Portfolio <noreply@chike.ng>',
      to:      ['hello@chike.ng'],
      replyTo: email,
      subject: `[INBOUND] ${label} — ${name}`,
      html:    notificationEmail({ name, email, type: label, subject, message, ts }),
    });

    /* ── 2. confirm to sender ── */
    await resend.emails.send({
      from:    'Chike Oguh <noreply@chike.ng>',
      to:      [email],
      replyTo: 'hello@chike.ng',
      subject: `Transmission received — chike.ng`,
      html:    confirmationEmail({ name, email, type: label, subject, message, ts }),
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[RESEND ERROR]', err?.message || err);
    return res.status(500).json({ error: 'Failed to transmit. Please try again.' });
  }
};

/* ─────────────────────────────────────────────────────────────
   EMAIL TEMPLATES
───────────────────────────────────────────────────────────── */

function shell({ title, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#020408;font-family:'Courier New',Courier,monospace">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#020408;padding:40px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

  <!-- header -->
  <tr>
    <td style="background:#0d1117;border:1px solid rgba(0,255,136,.14);border-bottom:none;border-radius:12px 12px 0 0;padding:14px 22px">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="80">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ff5f57;margin-right:5px"></span>
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#febc2e;margin-right:5px"></span>
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#28c840"></span>
        </td>
        <td align="center" style="font-size:11px;color:#4a5568;letter-spacing:.12em">${title}</td>
        <td align="right" width="80" style="font-size:10px;color:#2d3748;letter-spacing:.1em">SECURE</td>
      </tr></table>
    </td>
  </tr>

  <!-- body -->
  <tr>
    <td style="background:#080c12;border-left:1px solid rgba(0,255,136,.1);border-right:1px solid rgba(0,255,136,.1);padding:32px 28px">
      <p style="margin:0 0 28px;font-size:10px;color:#00ff88;letter-spacing:.2em;text-transform:uppercase">// CHIKE.NG — SECURE TRANSMISSION</p>
      ${body}
    </td>
  </tr>

  <!-- footer -->
  <tr>
    <td style="background:#0d1117;border:1px solid rgba(0,255,136,.1);border-top:1px solid rgba(0,255,136,.07);border-radius:0 0 12px 12px;padding:16px 22px;text-align:center">
      <p style="margin:0;font-size:11px;color:#4a5568;letter-spacing:.08em">
        <span style="color:#00ff88">chike</span>.oguh &nbsp;·&nbsp; hello@chike.ng &nbsp;·&nbsp; Portugal
      </p>
      <p style="margin:6px 0 0;font-size:10px;color:#2d3748">Built with lines of code by Chike</p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function confirmationEmail({ name, email, type, subject, message, ts }) {
  return shell({
    title: 'transmission_receipt.sh — chike.oguh',
    body: `
      <p style="margin:0 0 6px;font-size:12px;color:#4a5568">$ whoami --sender</p>
      <p style="margin:0 0 28px;font-size:15px;color:#edf2f7;padding-left:14px;font-weight:600">Hello, ${x(name)}</p>

      <p style="margin:0 0 8px;font-size:12px;color:#4a5568">$ cat transmission.log</p>
      <table cellpadding="0" cellspacing="0" width="100%"
        style="background:#0a0e14;border:1px solid rgba(0,255,136,.13);border-radius:8px;margin-bottom:28px">
        <tr><td style="padding:20px">
          <table cellpadding="0" cellspacing="0" width="100%" style="font-size:12px;line-height:2.1">
            <tr><td width="96" style="color:#4a5568;vertical-align:top">STATUS</td>   <td style="color:#00ff88">202 Accepted ✓</td></tr>
            <tr><td style="color:#4a5568;vertical-align:top">TIMESTAMP</td><td style="color:#8892a4">${x(ts)}</td></tr>
            <tr><td style="color:#4a5568;vertical-align:top">FROM</td>      <td style="color:#00d4ff">${x(name)} &lt;${x(email)}&gt;</td></tr>
            <tr><td style="color:#4a5568;vertical-align:top">TO</td>        <td style="color:#edf2f7">hello@chike.ng</td></tr>
            <tr><td style="color:#4a5568;vertical-align:top">TYPE</td>      <td style="color:#edf2f7">${x(type)}</td></tr>
            <tr><td style="color:#4a5568;vertical-align:top">SUBJECT</td>   <td style="color:#edf2f7">${x(subject)}</td></tr>
            <tr><td style="color:#4a5568;vertical-align:top">ETA</td>       <td style="color:#edf2f7">Response within 24h</td></tr>
          </table>
        </td></tr>
      </table>

      <p style="margin:0 0 8px;font-size:12px;color:#4a5568">$ cat message.txt</p>
      <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px">
        <tr>
          <td width="3" style="background:#00ff88;border-radius:2px 0 0 2px">&nbsp;</td>
          <td style="background:#0a0e14;padding:16px 20px;border-radius:0 6px 6px 0;border:1px solid rgba(255,255,255,.05);border-left:none">
            <p style="margin:0;font-size:13px;color:#8892a4;line-height:1.8;white-space:pre-wrap">${x(message)}</p>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 6px;font-size:12px;color:#4a5568">$ echo $NEXT_STEPS</p>
      <p style="margin:0 0 28px;font-size:13px;color:#edf2f7;padding-left:14px;line-height:1.7">
        Your message has been received and logged.<br>
        Chike will be in touch shortly. Connect on
        <a href="https://linkedin.com/in/chikeoguh" style="color:#00d4ff;text-decoration:none">LinkedIn</a> in the meantime.
      </p>

      <p style="margin:0;font-size:12px;color:#4a5568">
        <span style="color:#00ff88">$</span>
        <span style="color:#edf2f7"> echo "Talk soon." &nbsp;—&nbsp;</span>
        <span style="color:#00ff88">Chike</span>
      </p>
    `,
  });
}

function notificationEmail({ name, email, type, subject, message, ts }) {
  return shell({
    title: 'inbound_message.sh — chike.ng',
    body: `
      <table cellpadding="0" cellspacing="0" width="100%"
        style="background:rgba(0,212,255,.05);border:1px solid rgba(0,212,255,.2);border-radius:8px;margin-bottom:28px">
        <tr><td style="padding:14px 20px">
          <p style="margin:0;font-size:12px;color:#00d4ff;letter-spacing:.1em">
            INBOUND TRANSMISSION &nbsp;·&nbsp; NEW ${x(type.toUpperCase())}
          </p>
        </td></tr>
      </table>

      <p style="margin:0 0 8px;font-size:12px;color:#4a5568">$ cat inbound.log</p>
      <table cellpadding="0" cellspacing="0" width="100%"
        style="background:#0a0e14;border:1px solid rgba(0,255,136,.13);border-radius:8px;margin-bottom:28px">
        <tr><td style="padding:20px">
          <table cellpadding="0" cellspacing="0" width="100%" style="font-size:12px;line-height:2.1">
            <tr><td width="96" style="color:#4a5568;vertical-align:top">TIMESTAMP</td><td style="color:#8892a4">${x(ts)}</td></tr>
            <tr><td style="color:#4a5568;vertical-align:top">FROM</td>     <td style="color:#00d4ff">${x(name)} &lt;${x(email)}&gt;</td></tr>
            <tr><td style="color:#4a5568;vertical-align:top">TYPE</td>     <td style="color:#00ff88">${x(type)}</td></tr>
            <tr><td style="color:#4a5568;vertical-align:top">SUBJECT</td>  <td style="color:#edf2f7">${x(subject)}</td></tr>
            <tr><td style="color:#4a5568;vertical-align:top">STATUS</td>   <td style="color:#00ff88">ACK — confirmation sent ✓</td></tr>
          </table>
        </td></tr>
      </table>

      <p style="margin:0 0 8px;font-size:12px;color:#4a5568">$ cat message.txt</p>
      <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px">
        <tr>
          <td width="3" style="background:#00d4ff;border-radius:2px 0 0 2px">&nbsp;</td>
          <td style="background:#0a0e14;padding:16px 20px;border-radius:0 6px 6px 0;border:1px solid rgba(255,255,255,.05);border-left:none">
            <p style="margin:0;font-size:13px;color:#8892a4;line-height:1.8;white-space:pre-wrap">${x(message)}</p>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 8px;font-size:12px;color:#4a5568">$ reply --to sender</p>
      <p style="margin:0;padding-left:14px">
        <a href="mailto:${x(email)}?subject=Re: ${x(subject)}"
          style="display:inline-block;font-size:12px;color:#000;background:#00ff88;padding:10px 24px;border-radius:5px;text-decoration:none;letter-spacing:.08em;font-weight:700">
          Reply to ${x(name)} ›
        </a>
      </p>
    `,
  });
}

function x(s = '') {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
