// components/ui/Tooltip.tsx

// Explicație scurtă afișată la trecerea cursorului (atributul title); neutilizată în prezent.
type TooltipProps = {
  label: string;
  children: React.ReactNode;
};

export function Tooltip({
  label,
  children,
}: TooltipProps) {
  return (
    <span
      className="ui-tooltip"
      title={label}
    >
      {children}
    </span>
  );
}