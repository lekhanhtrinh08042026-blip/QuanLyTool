import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'MAKINO · FSE HCM · Kho vật tư', description: 'Kho vật tư FSE HCM. Mượn nhanh. Trả gọn. Quản lý rõ ràng.' };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="vi"><body>{children}</body></html>; }
