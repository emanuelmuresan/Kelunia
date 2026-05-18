
type BadgeProps = {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
};

export function Badge({
  children,
  variant = "default",
}: BadgeProps) {
  return (
    <span className={`ui-badge ${variant}`}>
      {children}
    </span>
  );
}