/**
 * Blockchain & Web3 page — wallet, screening NFTs, HIPAA records, DAO.
 */
import React from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AccessibleChainSelector,
  ConnectWalletButton,
  ScreeningResultBlockchain,
  OracleVerificationCard,
  PediScreenBlockchainUI,
} from "@/components/blockchain";
import { Wallet, FileCheck, Shield, ImageIcon, Coins, LayoutDashboard } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const BlockchainPage = () => {
  const location = useLocation();
  const isDashboard = location.pathname.includes("blockchain-dashboard");

  if (isDashboard) {
    return <PediScreenBlockchainUI />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Blockchain & Web3</h1>
            <p className="text-muted-foreground text-lg">
              HIPAA-aligned screening records (on-chain hashes), screening NFTs, and
              USDC micropayments on Polygon.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Active network
              </span>
              <AccessibleChainSelector />
            </div>
          </div>
          <ConnectWalletButton />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <Card className="border-none shadow-sm hover:bg-muted/20 transition-colors">
            <CardContent className="pt-6">
              <Wallet className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-bold mb-2">Wallet</h3>
              <p className="text-sm text-muted-foreground">
                Connect via WalletConnect. Required for NFTs and federated learning rewards.
              </p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm hover:bg-muted/20 transition-colors">
            <CardContent className="pt-6">
              <FileCheck className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-bold mb-2">Screening records</h3>
              <p className="text-sm text-muted-foreground">
                Hashes only on-chain. Consent and audit trail via PediScreenRecords & Governor.
              </p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm hover:bg-muted/20 transition-colors">
            <CardContent className="pt-6">
              <ImageIcon className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-bold mb-2">Screening NFTs</h3>
              <p className="text-sm text-muted-foreground">
                Mint ERC-721 screening NFTs (PediScreenRegistry). Verify via Supabase.
              </p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm hover:bg-muted/20 transition-colors">
            <CardContent className="pt-6">
              <Coins className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-bold mb-2">Payments</h3>
              <p className="text-sm text-muted-foreground">
                USDC micropayments (PaymentEscrow). DAO governance with PSDAOToken.
              </p>
            </CardContent>
          </Card>
        </div>

          <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Screening result on-chain
            </CardTitle>
            <CardDescription>
              After a screening, you can attach blockchain verification (hash/NFT). Shown on results when configured.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScreeningResultBlockchain
              screeningId="demo"
              aiReportHash="0x0000000000000000000000000000000000000000000000000000000000000000"
              onMinted={() => {}}
            />
            {/* Demo oracle card listening to on-chain PediScreenOracle events.
               In production, pass the real on-chain screeningId (uint256) returned by the contract. */}
            <OracleVerificationCard screeningId={1} />
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link to="/pediscreen/blockchain-dashboard">
            <Button className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700">
              <LayoutDashboard className="w-4 h-4" />
              NFT Dashboard
            </Button>
          </Link>
          <Link to="/pediscreen/blockchain-kaggle">
            <Button variant="outline" className="gap-2 rounded-xl">
              Kaggle Demo Flow
            </Button>
          </Link>
          <Link to="/pediscreen/oracle-dashboard">
            <Button variant="outline" className="gap-2 rounded-xl">
              Chainlink Oracle Dashboard
            </Button>
          </Link>
          <Link to="/pediscreen/dao">
            <Button variant="outline" className="gap-2 rounded-xl">
              DAO Governance
            </Button>
          </Link>
          <Link to="/pediscreen/healthchain">
            <Button variant="outline" className="gap-2 rounded-xl">
              Patient data exchange (HealthChain POC)
              <Coins className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default BlockchainPage;
