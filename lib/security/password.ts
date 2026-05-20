export const minimumPasswordLength = 8;

export function passwordSecurityError(password: string, email = "") {
  if (password.length < minimumPasswordLength) {
    return `Parola trebuie să aibă cel puțin ${minimumPasswordLength} caractere.`;
  }

  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Parola trebuie să conțină cel puțin o literă și o cifră.";
  }

  const emailName = email.split("@")[0]?.trim().toLowerCase() ?? "";

  if (emailName.length >= 4 && password.toLowerCase().includes(emailName)) {
    return "Parola nu trebuie să conțină partea principală din email.";
  }

  return "";
}
