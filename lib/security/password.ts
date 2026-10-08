// Regulile pentru parole la crearea contului: lungime minimă, literă și cifră, fără partea principală a emailului.
// Returnează un mesaj de eroare, sau șir gol dacă parola este acceptată.
export const minimumPasswordLength = 8;

export function passwordSecurityError(password: string, email = "") {
  if (password.length < minimumPasswordLength) {
    return `Parola trebuie să aibă cel puțin ${minimumPasswordLength} caractere.`;
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "Parola trebuie să conțină cel puțin o literă mare, o literă mică, o cifră și un caracter special (ex. ! ? # -).";
  }

  const emailName = email.split("@")[0]?.trim().toLowerCase() ?? "";

  if (emailName.length >= 4 && password.toLowerCase().includes(emailName)) {
    return "Parola nu trebuie să conțină partea principală din email.";
  }

  return "";
}
