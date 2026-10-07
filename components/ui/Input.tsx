
// Câmp de text care adaugă clasa ui-input peste atributele primite; neutilizat în prezent.
import type { InputHTMLAttributes } from "react";

type InputProps =
  InputHTMLAttributes<HTMLInputElement>;

export function Input(props: InputProps) {
  return (
    <input
      {...props}
      className={`ui-input ${props.className ?? ""}`}
    />
  );
}

export default Input;