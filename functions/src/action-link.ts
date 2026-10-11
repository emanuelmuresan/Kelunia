// Linkurile din emailurile de verificare și de resetare a parolei, pe domeniul Kelunia în loc de firebaseapp.com.
// Filtrele anti-spam penalizează linkurile către firebaseapp.com (regula URI_FIREBASEAPP), iar un link pe același domeniu cu expeditorul inspiră mai multă încredere.
// Codul unic (oobCode) rămâne cel generat de Firebase Auth; pagina /auth/action din aplicație îl aplică, la apăsarea unui buton.

// Transformă linkul generat de Firebase Auth (…/__/auth/action?mode=…&oobCode=…) într-un link către pagina aplicației.
// Dacă linkul nu are forma așteptată, îl întoarce neschimbat, ca emailul să rămână utilizabil.
export function brandedActionLink(firebaseLink: string, actionPageUrl: string, language: string) {
  try {
    const source = new URL(firebaseLink);
    const mode = source.searchParams.get("mode") ?? "";
    const oobCode = source.searchParams.get("oobCode") ?? "";

    if ((mode !== "verifyEmail" && mode !== "resetPassword") || !oobCode) {
      return firebaseLink;
    }

    const target = new URL(actionPageUrl);
    target.searchParams.set("mode", mode);
    target.searchParams.set("oobCode", oobCode);
    target.searchParams.set("lang", language);

    return target.toString();
  } catch {
    return firebaseLink;
  }
}
