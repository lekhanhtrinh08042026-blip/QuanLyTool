# Gmail qua Google Apps Script

1. Dan scripts/makino-gmail.gs vao Apps Script. Chay setup va cap quyen gui mail.
2. Deploy Web app: Execute as Me, Who has access Anyone.
3. Apps Script > Project Settings > Script properties: copy gia tri MAIL_SECRET.
4. Cloudflare > quanlytool > Settings > Runtime variables and secrets: tao Secret MAIL_SECRET, Value dan gia tri o buoc 3. Khong thay SESSION_SECRET hay ADMIN_PASSWORD_HASH.
5. MAIL_WEBHOOK_URL va cron moi 5 phut da duoc khai bao trong wrangler.json.
6. App > Ca nhan > Email thong bao: luu email chu kho nhan thong bao. Nguoi muon cung nhan ban sao.
7. Tao mot don muon moi. Xem Su kien email va hop thu (ke ca Spam). Cac su kien cu truoc ket noi khong duoc gui bu.

Nhac qua han: toi da mot lan moi ngay moi don, tu 08:00 gio Viet Nam. Ngay tra hien tai chi co ngay, nen ngay tiep theo moi tinh qua han. Thu loi mang thu lai toi da 5 lan; het han muc Gmail cho 24 gio. Trạng thai da gui nghia la MailApp da chap nhan, khong dam bao thu vao Inbox.

Bang mail_jobs duoc tao tu dong trong D1, tach biet du lieu kho. Khong xoa database. Khoa ket noi chi nam trong Script properties va Cloudflare Secret, khong luu vao GitHub. De tranh gui lai, moi email co id on dinh va Apps Script luu dau da gui 30 ngay. Gmail khong cung cap giao dich nguyen tu voi Script properties, nen trong su co hiem sau gui truoc ghi dau, retry co the gui trung.
