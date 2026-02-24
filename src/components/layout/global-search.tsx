import * as React from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useNavigate } from "react-router-dom";

const DEFAULT_SHORTCUTS = [
  { label: "Go to dashboard", path: "/dashboard" },
  { label: "New screening", path: "/pediscreen/screening" },
  { label: "Screening history", path: "/pediscreen/history" },
  { label: "Clinician review", path: "/pediscreen/report/:reportId" },
  { label: "Settings", path: "/settings" },
] as const;

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-label="Open global search"
      >
        <span className="hidden sm:inline">Search PediScreen</span>
        <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">
          ⌘K
        </span>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search routes (e.g. 'screening', 'dashboard')" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {DEFAULT_SHORTCUTS.map((item) => (
              <CommandItem
                key={item.path}
                onSelect={() => {
                  setOpen(false);
                  navigate(item.path.replace(":reportId", "example-report-id"));
                }}
              >
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

export default GlobalSearch;

