// components/ui/Select.tsx

// Listă derulantă care adaugă clasa ui-select peste atributele primite; neutilizată în prezent.
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