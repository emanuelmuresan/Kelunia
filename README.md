# Kelunia

Kelunia este aplicatia pentru programari pe locatie. Versiunea curenta este gandita ca v1 Standard: calendar, lista programari, programari fixe, sali, grupuri, coduri de acces, audit de baza, PWA si pregatire Capacitor pentru Android.

## Comenzi locale

```bash
npm install
npm run dev
npm run build
```

Ruleaza `npm install` dupa ce copiezi proiectul sau dupa ce apar dependinte noi, ca `package-lock.json` si pluginurile Capacitor sa fie sincronizate. Pentru development se foloseste `npm run dev`. Pentru web si Capacitor, `npm run build` produce export static in `out/`.

## Android cu Capacitor

```bash
npm run cap:sync:android
npm run cap:open:android
```

`cap:sync:android` trebuie rulat dupa modificarile web importante, ca Android Studio sa primeasca ultima versiune din `out/`.

## Firebase

Regulile sunt in `firestore.rules` si `storage.rules`, iar `firebase.json` este setat sa le publice pe ambele. Dupa schimbari la reguli sau indexuri, publica-le din proiectul Firebase:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## Directia pe versiuni

- v1 Standard: programari, sali, grupuri, notificari locale, recurring/fixe, audit de baza, PWA si Android.
- v2 Pro: echipamente, planuri interactive, analytics basic si documente in Storage.
- v3 Business: dashboard multi-locatie, permisiuni avansate, billing automat, invoicing, API si AI scheduling.

## Note de arhitectura

Documentatia de lucru este in `docs/`. Pagina principala trebuie sa ramana cat mai mult compozitie UI; citirile live, regulile de scheduling, permisiunile si licensing-ul trebuie mutate in `features/` si `lib/`.
