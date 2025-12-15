import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 py-12 text-center text-foreground">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold">Sivua ei löytynyt</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Pyytämääsi sivua ei löytynyt tai se on siirretty. Palaa takaisin
          etusivulle jatkaaksesi sovelluksen käyttöä.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Palaa etusivulle
      </Link>
    </main>
  );
}
