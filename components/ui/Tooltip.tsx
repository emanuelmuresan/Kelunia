// components/ui/Tooltip.tsx

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