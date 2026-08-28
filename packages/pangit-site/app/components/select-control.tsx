import type { ChangeEventHandler, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function SelectControl({ label, value, onChange, className, children }: {
  label: string;
  value: string;
  onChange: ChangeEventHandler<HTMLSelectElement>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={className ? `select-shell ${className}` : "select-shell"}>
      <span className="sr-only">{label}</span>
      <select aria-label={label} value={value} onChange={onChange}>
        {children}
      </select>
      <ChevronDown size={14} aria-hidden="true" />
    </label>
  );
}
