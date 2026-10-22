# MAKINO · Quản lý kho vật tư

Web app riêng cho Cloudflare Workers, D1 và R2. Không phụ thuộc đăng nhập ChatGPT.

## Trạng thái
- Giao diện tiếng Việt tối ưu điện thoại: Mượn / Trả / Quản lí Kho / Cá Nhân.
- User: nhập email trong danh sách, không OTP theo yêu cầu. Đây là nhận diện do người dùng khai báo, không xác minh quyền sở hữu Gmail.
- Admin: mật khẩu kiểm tra tại server bằng PBKDF2. Cookie HttpOnly, SameSite=Lax, Secure khi HTTPS; phiên tối đa 30 ngày. Mật khẩu/khóa thật không có trong Git.
- Mượn/trả trực tiếp, không duyệt. Trả một phần, Tốt/Khác, ghi giờ Việt Nam.
- Admin thêm/sửa/xóa ẩn vật tư, phân loại, tên tắt, hiện trạng nhiều ảnh; quản lý Gmail và xuất Excel .xlsx.
- Database online bắt đầu trống. Không có nút nạp mẫu trên production và API từ chối seed.
- **Email tự động và đồng bộ Google Drive chưa được kết nối.**

## 1. Cài và build
Node >=22.13. `npm ci`, `npm run build`.
Cloudflare > quanlytool > Settings > Build:
- Production branch: `main`
- Root directory: `/`
- Build command: `npm run build`
- Deploy command: `npm run deploy`
- Preview command nếu bật preview branch: `npx wrangler versions upload --config dist/server/wrangler.json`

Deploy dùng cấu hình được sinh ở dist/server/wrangler.json, không deploy worker/index.ts trực tiếp.

## 2. Database riêng, không mang dữ liệu local lên
Cloudflare > Storage & databases > D1 > Create database: `makino-kho-db`.
Lấy Database ID (không phải mật khẩu). Thêm vào `wrangler.json`:
```json
"d1_databases": [{"binding":"DB","database_name":"makino-kho-db","database_id":"THAY_BANG_DATABASE_ID_THAT","migrations_dir":"drizzle"}]
```
Áp dụng hai migration theo thứ tự (trên máy đã `npx wrangler login`):
```
npx wrangler d1 execute makino-kho-db --remote --config wrangler.json --file drizzle/0000_glamorous_wilson_fisk.sql
npx wrangler d1 execute makino-kho-db --remote --config wrangler.json --file drizzle/0001_glossy_azazel.sql
```
Hoặc chạy SQL tương ứng trong D1 Console. Không nhập dữ liệu test/seed vào database online.

## 3. Ảnh
Kích hoạt R2 nếu đồng ý các điều khoản/chi phí của Cloudflare. Tạo bucket riêng tư `makino-kho-images`, thêm vào wrangler.json:
```json
"r2_buckets": [{"binding":"BUCKET","bucket_name":"makino-kho-images"}]
```
Không mở public bucket. App kiểm tra quyền trước khi đọc ảnh.
Chưa có R2 vẫn có thể thử các chức năng khác; tải ảnh sẽ báo chưa cấu hình.

## 4. Bí mật runtime
Chạy `npm run auth:setup` trong terminal riêng. Nhập mật khẩu Admin bạn muốn dùng (ẩn ký tự). Script tạo hai giá trị:
- SESSION_SECRET
- ADMIN_PASSWORD_HASH
Thêm cả hai dưới dạng Secret tại Cloudflare > quanlytool > Settings > Variables and Secrets. Đây là biến runtime, không phải Build variables. Không đưa giá trị vào README, commit, ảnh chụp hoặc chat.
Lưu secrets, redeploy. Admin đăng nhập, thêm Gmail vào allowlist. User không được nâng quyền qua Gmail có role admin. Gỡ Gmail có hiệu lực ở request tiếp theo.

## Dữ liệu
D1 lưu snapshot có revision để cập nhật nguyên tử, chống ghi đè/trừ kho trùng; phù hợp bản thử quy mô nhỏ. Bản thử giới hạn snapshot 1.8 MB và cần chuẩn hóa thành các bảng quan hệ khi dữ liệu tăng. R2 lưu ảnh. Excel tồn kho không phải backup toàn bộ.
Cần bổ sung backup D1+R2 và thử khôi phục trước khi vận hành chính thức. Bản phát triển chưa hoàn thiện lịch backup/nhắc hạn hay Google Drive.

## Kiểm tra
`npm test`: 18 nghiệp vụ và 9 kiểm tra auth.
`node tests/integration.mjs`: khởi tạo database test cục bộ riêng, thử API mượn/trả, phân quyền, thu hồi Gmail, Excel. Không đụng dữ liệu online.
`npx tsc --noEmit`.

## Lỗi thường gặp
- `Could not detect a directory containing static files`: repo chưa có app/config, hoặc chưa build. Kiểm tra lệnh ở mục 1.
- Đăng nhập báo chưa cấu hình: kiểm tra D1, migration và 2 Secret runtime.
- Tải ảnh báo chưa kết nối: chưa bind R2.
- Bị 429 sau nhiều lần đăng nhập: chờ 15 phút.
- Deployment ban đầu chỉ hiện form đăng nhập và chưa vào được: cần hoàn tất mục 2–4, không phải kho đã có dữ liệu.
