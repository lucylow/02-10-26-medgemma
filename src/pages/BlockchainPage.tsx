/**
 * Blockchain & Web3 page — wallet, screening NFTs, HIPAA records, DAO.
 */
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConnectWalletButton, ScreeningResultBlockchain } from "@/components/blockchain";
import { Wallet, FileCheck, Shield, ImageIcon, Coins } from "lucide-react";
import { Link } from "react-router-dom";

const BlockchainPage = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Blockchain & Web3</h1>
            <p className="text-muted-foreground text-lg">
              HIPAA-aligned screening records (on-chain hashes), screening NFTs, and USDC micropayments on Polygon.
            </p>
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
          <CardContent>
            <ScreeningResultBlockchain
              screeningId="demo"
              aiReportHash="0x0000000000000000000000000000000000000000000000000000000000000000"
              onMinted={() => {}}
            />
          </CardContent>
        </Card>

        <div className="mt-8">
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
