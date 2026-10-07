// components/ui/Loading.tsx

// Indicator de încărcare cu spinner și text; neutilizat în prezent.
export function Loading() {
  return (
    <div className="loading-state">
      <span className="spinner" />

      <p>Se încarcă...</p>
    </div>
  );
}