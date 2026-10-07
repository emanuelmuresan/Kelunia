"use client";

// Buton generic cu variantă vizuală (primar, secundar, pericol); neutilizat în prezent.
type ButtonProps = {
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  onClick?: () => void;
};

export function Button({
  children,
  type = "button",
  variant = "primary",
  disabled,
  onClick,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`ui-button ${variant}`}
    >
      {children}
    </button>
  );
}

export default Button;