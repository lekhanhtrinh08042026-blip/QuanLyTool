function setup() {
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty('MAIL_SECRET')) p.setProperty('MAIL_SECRET', Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''));
  Logger.log('Da san sang. Han muc nguoi nhan con lai: ' + MailApp.getRemainingDailyQuota());
}
function doGet() { return reply_({ok:true, service:'MAKINO Mail'}); }
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 40000) return reply_({ok:false,error:'INVALID_REQUEST'});
    var m = JSON.parse(raw), p = PropertiesService.getScriptProperties();
    var secret = p.getProperty('MAIL_SECRET');
    if (!secret || secret.length < 32 || m.secret !== secret) return reply_({ok:false,error:'UNAUTHORIZED'});
    if (typeof m.id !== 'string' || !/^[A-Za-z0-9:_-]{1,160}$/.test(m.id)) return reply_({ok:false,error:'INVALID_ID'});
    if (!Array.isArray(m.to) || m.to.length !== 1 || typeof m.to[0] !== 'string' || m.to[0].length > 254 || !/^[^\s,;<>@]+@[^\s,;<>@]+\.[^\s,;<>@]+$/.test(m.to[0])) return reply_({ok:false,error:'INVALID_RECIPIENT'});
    if (typeof m.subject !== 'string' || !m.subject.trim() || m.subject.length > 200 || /[\r\n]/.test(m.subject) || typeof m.text !== 'string' || !m.text.trim() || m.text.length > 20000) return reply_({ok:false,error:'INVALID_MESSAGE'});
    if (!lock.tryLock(5000)) return reply_({ok:false,error:'BUSY'});
    var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, m.id + ':' + m.to[0].toLowerCase());
    var key = 'sent_' + Utilities.base64EncodeWebSafe(digest);
    if (p.getProperty(key)) return reply_({ok:true,duplicate:true});
    if (MailApp.getRemainingDailyQuota() < 1) return reply_({ok:false,error:'DAILY_QUOTA'});
    MailApp.sendEmail({to:m.to[0],subject:m.subject,body:m.text,name:'MAKINO - Kho vat tu'});
    p.setProperty(key,String(Date.now()));
    var saved = p.getProperties();
    Object.keys(saved).forEach(function(k) {
      if (k.indexOf('sent_') === 0 && Number(saved[k]) < Date.now() - 30 * 86400000) p.deleteProperty(k);
    });
    return reply_({ok:true});
  } catch (_) { return reply_({ok:false,error:'SEND_FAILED'}); }
  finally { if (lock.hasLock()) lock.releaseLock(); }
}
function reply_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
