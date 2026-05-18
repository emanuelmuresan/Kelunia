// components/ui/Select.tsx

import type {
  SelectHTMLAttributes,
} from "react";

type SelectProps =
  SelectHTMLAttributes<HTMLSelectElement>;

export function Select(props: SelectProps) {
  return (
    <select
      {...props}
      className={`ui-select ${props.className ?? ""}`}
    />
  );
}