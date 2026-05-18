
type CardProps = {
  children: React.ReactNode;
};

export function Card({
  children,
}: CardProps) {
  return (
    <section className="ui-card">
      {children}
    </section>
  );
}