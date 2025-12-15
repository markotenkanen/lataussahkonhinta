import Link from "next/link"

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="mt-2 text-3xl font-semibold">Sivua ei löytynyt</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Pyytämääsi sivua ei löytynyt tai se on siirretty. Palaa etusivulle
        jatkaaksesi sovelluksen käyttöä.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Palaa etusivulle
      </Link>
    </main>
  )
}
