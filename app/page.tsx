import { ElectricityDashboard } from "@/components/electricity-dashboard"
import { LanguageProvider } from "@/lib/translations"
import { UpdateBanner } from "@/components/update-banner"
import Script from "next/script"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <LanguageProvider>
        <UpdateBanner />
        <ElectricityDashboard />
      </LanguageProvider>
      <Script id="register-sw" strategy="afterInteractive">
        {`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').then(
                (registration) => {
                  console.log('Service Worker registered:', registration.scope);
                },
                (error) => {
                  console.log('Service Worker registration failed:', error);
                }
              );
            });
          }
        `}
      </Script>
    </main>
  )
}
