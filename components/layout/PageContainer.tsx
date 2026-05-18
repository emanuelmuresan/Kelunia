import { ReactNode } from "react";

type PageContainerProps = {
  title?: string;
  description?: string;
  children: ReactNode;
};

export function PageContainer({
  title,
  description,
  children,
}: PageContainerProps) {
  return (
    <div className="page-container">
      {(title || description) && (
        <div className="page-header">
          {title && <h1>{title}</h1>}
          {description && <p>{description}</p>}
        </div>
      )}

      {children}
    </div>
  );
}

export default PageContainer;