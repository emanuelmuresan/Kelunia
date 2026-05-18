type LogoProps = {
  size?: number;
  showText?: boolean;
};

export function Logo({
  size = 40,
  showText = true,
}: LogoProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "14px",
          background:
            "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 700,
          fontSize: size * 0.42,
          letterSpacing: "-0.04em",
          boxShadow:
            "0 10px 30px rgba(79,70,229,0.35)",
          flexShrink: 0,
        }}
      >
        K
      </div>

      {showText && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            lineHeight: 1,
          }}
        >
          <strong
            style={{
              fontSize: "1rem",
              letterSpacing: "-0.03em",
            }}
          >
            Kelunia
          </strong>

          <span
            style={{
              fontSize: "0.78rem",
              opacity: 0.7,
            }}
          >
            Life, together.
          </span>
        </div>
      )}
    </div>
  );
}