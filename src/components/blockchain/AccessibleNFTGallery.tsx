import React from "react";
import { useA11yContext } from "@/components/a11y/AccessiblePediScreenProvider";

export interface ScreeningNFT {
  tokenId: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  childAgeMonths: number;
  assessmentTimestamp: number;
  domains: {
    communication: number;
    motor: number;
    socialEmotional: number;
  };
}

interface AccessibleNFTGalleryProps {
  nfts: ScreeningNFT[];
  address: string;
}

export const AccessibleNFTGallery: React.FC<AccessibleNFTGalleryProps> = ({
  nfts,
  address,
}) => {
  const a11y = useA11yContext(false);

  return (
    <section tabIndex={-1} className="space-y-6">
      <div
        role="region"
        aria-label="Screening certificates overview"
        className="bg-gradient-to-r from-emerald-50 to-blue-50 p-6 rounded-2xl border border-emerald-200"
      >
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Your certificates
        </h2>
        <p aria-live="polite" className="text-lg text-foreground/80">
          {nfts.length} screening certificate
          {nfts.length !== 1 ? "s" : ""} stored securely in your wallet
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {address.slice(0, 6)}…{address.slice(-4)}
        </p>
      </div>

      <ul
        aria-label={`${nfts.length} developmental screening certificates`}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {nfts.map((nft, index) => (
          <li
            key={nft.tokenId}
            className="group"
            aria-label={`Certificate ${index + 1} of ${nfts.length}, ${
              nft.riskLevel
            } risk, ${nft.childAgeMonths} months`}
          >
            <article
              className="bg-card rounded-2xl shadow-lg hover:shadow-xl border border-border p-6 h-full transition-all"
              aria-labelledby={`nft-title-${nft.tokenId}`}
            >
              <div
                role="status"
                aria-label={`${nft.riskLevel} risk level`}
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold mb-4 ${
                  nft.riskLevel === "LOW"
                    ? "bg-emerald-100 text-emerald-800"
                    : nft.riskLevel === "MEDIUM"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                <span aria-hidden="true">
                  {nft.riskLevel === "LOW"
                    ? "🟢"
                    : nft.riskLevel === "MEDIUM"
                    ? "🟡"
                    : "🔴"}
                </span>
                <span className="ml-1">{nft.riskLevel}</span>
              </div>

              <header>
                <h3
                  id={`nft-title-${nft.tokenId}`}
                  className="text-xl font-bold text-foreground mb-2"
                >
                  {nft.childAgeMonths} months screening
                </h3>
                <time
                  dateTime={new Date(
                    nft.assessmentTimestamp * 1000,
                  ).toISOString()}
                  className="text-sm text-muted-foreground"
                >
                  {new Date(
                    nft.assessmentTimestamp * 1000,
                  ).toLocaleDateString()}
                </time>
              </header>

              <table
                role="grid"
                aria-label="Developmental domain scores"
                className="w-full mt-6"
              >
                <caption className="sr-only">
                  Domain scores for this screening
                </caption>
                <thead className="sr-only">
                  <tr>
                    <th scope="col">Domain</th>
                    <th scope="col">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    ["communication", "motor", "socialEmotional"] as const
                  ).map((domain) => (
                    <tr key={domain} role="row">
                      <th scope="row" className="text-left py-2">
                        <span className="capitalize">
                          {domain === "socialEmotional"
                            ? "social and emotional"
                            : domain}
                        </span>
                      </th>
                      <td className="py-2">
                        <div
                          className="w-full bg-muted rounded-full h-3 overflow-hidden"
                          role="progressbar"
                          aria-valuenow={Math.round(
                            nft.domains[domain] * 100,
                          )}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${domain} score ${Math.round(
                            nft.domains[domain] * 100,
                          )}%`}
                        >
                          <div
                            className={`h-3 rounded-full transition-all duration-700 ${
                              nft.domains[domain] > 0.8
                                ? "bg-emerald-500"
                                : nft.domains[domain] > 0.6
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                            style={{
                              width: `${nft.domains[domain] * 100}%`,
                            }}
                          />
                        </div>
                        <span className="sr-only">
                          {Math.round(nft.domains[domain] * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <nav
                aria-label="Certificate actions"
                className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-border/60"
              >
                <WalletActionButton
                  action="share"
                  label="Share with doctor"
                  onClick={() =>
                    a11y?.announce?.(
                      `Sharing certificate ${nft.tokenId} with doctor`,
                    )
                  }
                />
                <WalletActionButton
                  action="qrcode"
                  label="Show QR code"
                  onClick={() =>
                    a11y?.announce?.(
                      `QR code for certificate ${nft.tokenId} displayed`,
                    )
                  }
                />
                <WalletActionButton
                  action="verify"
                  label="View on PolygonScan"
                  href={`https://polygonscan.com/token/0x742d35Cc6b6DBcF823d80ADa7017a40A9D0e6637?a=${nft.tokenId}`}
                />
              </nav>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
};

interface WalletActionButtonProps {
  action: "share" | "qrcode" | "verify";
  label: string;
  href?: string;
  onClick?: () => void;
}

const WalletActionButton: React.FC<WalletActionButtonProps> = ({
  action,
  label,
  href,
  onClick,
}) => {
  const a11y = useA11yContext(false);

  const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    a11y?.announce?.(`${action} action selected: ${label}`);
    onClick?.();
    if (href && e.type === "click") {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  const baseClasses =
    "flex items-center justify-center px-4 py-3 rounded-xl font-medium transition-all focus:outline-none focus:ring-4 focus:ring-offset-2 min-h-[44px] text-sm";

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleClick(e);
          }
        }}
        role="button"
        className={`${baseClasses} bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl`}
        aria-label={`${label}, opens in new tab`}
      >
        <span aria-hidden="true" className="mr-2">
          {action === "share"
            ? "📤"
            : action === "qrcode"
            ? "📱"
            : "🔗"}
        </span>
        {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e);
        }
      }}
      className={`${baseClasses} bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg hover:shadow-xl`}
      aria-label={label}
    >
      <span aria-hidden="true" className="mr-2">
        {action === "share" ? "📤" : action === "qrcode" ? "📱" : "✅"}
      </span>
      {label}
    </button>
  );
};

