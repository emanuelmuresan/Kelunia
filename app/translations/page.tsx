// Pagină internă care afișează tot catalogul de texte al aplicației, pe limbi, ca să verificăm traducerile dintr-o privire.
import { appCopyCatalog, supportedLocales } from "@/lib/i18n/app-copy-catalog";

// Pagina nu are stare: doar citește catalogul și îl desenează ca tabel.
export default function TranslationsPage() {
  return (
    // Antet: titlul paginii și o scurtă explicație despre catalog.
    <main className="translation-page">
      <section className="translation-hero">
        <div>
          <span className="eyebrow">Localizare</span>
          <h1>Texte aplicație</h1>
        </div>
        <p>
          Catalog central pentru textele Kelunia. Româna rămâne sursa principală, iar coloanele de traducere pregătesc aplicația pentru engleză, spaniolă, italiană, franceză și portugheză.
        </p>
      </section>

      {/* Rezumat: câte o căsuță pentru fiecare limbă pregătită. */}
      <section className="translation-summary" aria-label="Limbi pregătite">
        {supportedLocales.map((locale) => (
          <div key={locale.code}>
            <span>{locale.code.toUpperCase()}</span>
            <strong>{locale.label}</strong>
          </div>
        ))}
      </section>

      {/* Tabelul propriu-zis: pe fiecare rând o cheie de text, pe coloane traducerile. */}
      <section className="translation-table-wrap">
        <table className="translation-table">
          <thead>
            <tr>
              <th>Zona</th>
              <th>Cheie</th>
              {/* Capul de tabel are o coloană pentru fiecare limbă. */}
              {supportedLocales.map((locale) => (
                <th key={locale.code}>{locale.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Un rând pentru fiecare intrare din catalog. */}
            {appCopyCatalog.map((entry) => (
              <tr key={entry.key}>
                <td>{entry.area}</td>
                <td><code>{entry.key}</code></td>
                {supportedLocales.map((locale) => (
                  <td key={locale.code}>{entry[locale.code]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
