
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