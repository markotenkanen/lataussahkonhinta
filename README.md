# Lataussähkön hinta

Tämä repo sisältää Next.js-projektin. Jos `git pull` ei toimi, koska etärepoa ei ole määritetty (esim. viesti "No remote configured"), toimi seuraavasti iPadilla:

1. Asenna SSH/komentorivisovellus (esim. Termius tai iSH) tai käytä Git-asiakasta kuten Working Copy.
2. Selvitä oikea etärepon osoite (HTTPS tai SSH). Esimerkki: `https://github.com/oma-kayttaja/lataussahkonhinta.git`.
3. Lisää etärepo:
   ```sh
   git remote add origin <etarepon-url>
   ```
4. Tarkista, että etärepo on tallentunut:
   ```sh
   git remote -v
   ```
5. Yhdistä paikallinen haara etähaaraan, jotta `git pull` toimii jatkossa:
   ```sh
   git fetch origin
   git branch --set-upstream-to=origin/work work
   ```
6. Hae uusin versio:
   ```sh
   git pull
   ```

Jos käytät HTTPS-yhteyttä, varmista, että henkilökohtainen käyttöoikeustoken (PAT) on valmiina tunnistautumista varten. SSH-yhteyttä käyttäessäsi lisää julkinen avain Git-palveluun ennen `git pull` -komentoa.

## Voiko muutokset tehdä GitHubin sivulla?

Kyllä. Voit muokata tiedostoja suoraan GitHubin selaimessa esimerkiksi iPadilla:

1. Avaa repo GitHubissa ja siirry muokattavaan tiedostoon (esim. README.md).
2. Paina tiedostosivun oikeassa yläkulmassa olevaa **kynä**-ikonia (Edit this file).
3. Tee muutokset editorissa. Selaimen esikatselu näyttää diffit heti.
4. Vieritä alas, kirjoita kuvaava commit-viesti ja valitse, tehdäänkö uusi haara vai suoraan nykyiseen.
5. Paina **Commit changes** tai avaa **Propose changes** / **Create pull request** riippuen valinnastasi.
6. Jos käytät yksityistä repoasi ensimmäistä kertaa kyseisellä laitteella, varmista että olet kirjautunut ja että sinulla on oikeudet puskea muutokset.

Web-muokkaus ei vaadi erillisiä sovelluksia, mutta paikallisten tiedostojen synkronointi (esim. iPadin Working Copy -appiin) vaatii silti `git pull`/`git fetch` -komennot tai sovelluksen omat synkronointitoiminnot.
