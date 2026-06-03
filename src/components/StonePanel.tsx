import React from "react";

export default function StonePanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`stone-frame ${className} pointer-events-auto`}
      role="region"
    >
      {children}
    </div>
  );
}
