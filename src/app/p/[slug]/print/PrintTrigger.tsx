"use client";

// Small button that fires the browser print dialog. Rendered separately from
// the print page's server component so the rest can stay a server component.
export function PrintTrigger() {
  return (
    <div className="flex flex-col items-end gap-1 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="btn-primary"
      >
        Print / save PDF
      </button>
      <p className="text-[10px] text-ink/50">
        or screenshot this whole page
      </p>
    </div>
  );
}
