/* Spam signatures + content filter (shared by the contact function and its test). */
const SPAM_PATTERNS = [
  /\bcasino\b/i, /\bpoker\b/i, /\bslot(s)?\b/i, /\bgambling\b/i,
  /\bcrypto\b/i, /\bbitcoin\b/i, /\bnft\b/i, /\bforex\b/i, /\btrading signals\b/i,
  /\bseo (service|boost|rank|expert|agency)\b/i, /\bbacklink(s)?\b/i, /\bguest post\b/i,
  /\bviagra\b/i, /\bcialis\b/i, /\bpharma\b/i, /\bmeds?\b/i,
  /\bmake money\b/i, /\bpassive income\b/i, /\bwork from home\b/i,
  /\bget rich\b/i, /\bunclaimed (funds|money|prize)\b/i,
  /\bloan offer\b/i, /\binstant (cash|money|loan)\b/i,
  /\bclick here\b/i, /\bact now\b/i, /\blimited time offer\b/i,
  /\bfree (money|gift|prize|iphone|ipad)\b/i,
  /\bwire transfer\b/i, /\bwestern union\b/i,
  /\bdear (friend|sir|madam)\b/i,
  /\bprince\b.*\b(million|transfer|fund)\b/i,
  /\b(100|1000)%\s*(free|guaranteed|legit)\b/i,
  /https?:\/\/(?!linkedin\.com|github\.com|chike\.ng)/i, // flag external URLs
];

function isSpam(fields) {
  const combined = Object.values(fields).join(' ');
  return SPAM_PATTERNS.some(p => p.test(combined));
}


export { isSpam, SPAM_PATTERNS };
