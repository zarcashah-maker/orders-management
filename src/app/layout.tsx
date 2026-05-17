import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'نظام إدارة الطلبات',
  description: 'منصة متكاملة لإدارة طلبات الإنتاج مع المصانع',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                fontFamily: 'Cairo, sans-serif',
                direction: 'rtl',
                borderRadius: '10px',
                background: '#1a1a1a',
                color: '#fff',
              },
              success: {
                iconTheme: { primary: '#f96d0a', secondary: '#fff' },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
