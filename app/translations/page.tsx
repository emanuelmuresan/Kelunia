import { appCopyCatalog, supportedLocales } from "@/lib/i18n/app-copy-catalog";

export default function TranslationsPage() {
  return (
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

      <section className="translation-summary" aria-label="Limbi pregătite">
        {supportedLocales.map((locale) => (
          <div key={locale.code}>
            <span>{locale.code.toUpperCase()}</span>
            <strong>{locale.label}</strong>
          </div>
        ))}
      </section>

      <section className="translation-table-wrap">
        <table className="translation-table">
          <thead>
            <tr>
              <th>Zona</th>
              <th>Cheie</th>
              {supportedLocales.map((locale) => (
                <th key={locale.code}>{locale.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
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
