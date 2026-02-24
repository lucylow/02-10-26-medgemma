import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

interface A11yContextType {
  announce: (message: string) => void;
  focusWalletStatus: () => void;
}

const A11yContext = createContext<A11yContextType | null>(null);

interface AccessiblePediScreenProviderProps {
  children: React.ReactNode;
}

export const AccessiblePediScreenProvider: React.FC<
  AccessiblePediScreenProviderProps
> = ({ children }) => {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  const announce = useCallback((message: string) => {
    if (!liveRegionRef.current) return;
    liveRegionRef.current.textContent = message;
  }, []);

  const focusWalletStatus = useCallback(() => {
    const walletStatus =
      document.querySelector<HTMLElement>("[data-wallet-status]");
    if (walletStatus) {
      walletStatus.focus();
      announce("Focus moved to wallet status");
    }
  }, [announce]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        announce("Command palette shortcut activated");
      }

      if (event.key === "Escape") {
        announce("Escape key pressed");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [announce]);

  return (
    <A11yContext.Provider value={{ announce, focusWalletStatus }}>
      {/* Live region for screen reader announcements */}
      <div
        ref={liveRegionRef}
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* Skip to main content for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only fixed top-4 left-4 z-50 bg-background text-foreground px-4 py-2 rounded-lg shadow-lg"
      >
        Skip to main content
      </a>

      {children}
    </A11yContext.Provider>
  );
};

export const useA11yContext = (
  required = true,
): A11yContextType | null => {
  const ctx = useContext(A11yContext);
  if (!ctx && required) {
    throw new Error(
      "useA11yContext must be used within AccessiblePediScreenProvider",
    );
  }
  return ctx;
};

