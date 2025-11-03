import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Suomen alueen pörssisähkön hintaseuranta",
  description: "Seuraa Nordpool-sähkön hintoja ja saa lataussuosituksia sähköautolle",
  generator: "v0.app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pörssisähkö",
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: "#3b82f6",
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fi">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Pörssisähkö" />
        <link rel="apple-touch-icon" href="/icon-192.jpg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Handle ChunkLoadError by reloading the page once
              window.addEventListener('error', function(event) {
                if (event.message && (event.message.includes('ChunkLoadError') || event.message.includes('Loading chunk'))) {
                  console.log('[v0] ChunkLoadError detected, reloading page...');
                  // Check if we've already reloaded to prevent infinite loops
                  const hasReloaded = sessionStorage.getItem('chunk-reload');
                  if (!hasReloaded) {
                    sessionStorage.setItem('chunk-reload', 'true');
                    window.location.reload();
                  } else {
                    console.error('[v0] ChunkLoadError persists after reload');
                  }
                }
              });
              
              // Clear the reload flag on successful load
              window.addEventListener('load', function() {
                sessionStorage.removeItem('chunk-reload');
              });
            `,
          }}
        />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}
