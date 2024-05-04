import Navbar from '@/components/Navbar'
import Providers from '@/components/Providers'
import type { Metadata, Viewport } from 'next'
import { Recursive } from 'next/font/google'
import 'simplebar-react/dist/simplebar.min.css'
import './globals.css'

const recursive = Recursive({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Cursed Detector',
  description: '',
}

export const viewport: Viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari, credit to https://github.com/ai-ng
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body className={recursive.className}>
        <Navbar />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
