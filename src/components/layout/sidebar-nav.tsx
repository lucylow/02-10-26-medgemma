import Sidebar from "./Sidebar";

// Atomic layout primitive that wraps the existing Sidebar component.
// Kept thin so routes and behavior continue to be defined in Sidebar.tsx.
export function SidebarNav(props: React.ComponentProps<typeof Sidebar>) {
  return <Sidebar {...props} />;
}

// Alias for compatibility with design spec naming.
export const SidebarNavigation = SidebarNav;

export default SidebarNav;


