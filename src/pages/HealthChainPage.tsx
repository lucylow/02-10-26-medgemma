/**
 * HealthChain POC page — submit record, grant clinic access, verify & import.
 */
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VerifyHealthChainRecord } from "@/components/blockchain";
import { useHealthChain } from "@/hooks/useHealthChain";
import { Link2, Shield, CheckCircle } from "lucide-react";

const HealthChainPage = () => {
  const { grantClinicAccess, isConfigured, loading, error } = useHealthChain();
  const [recordId, setRecordId] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [verifyRecordId, setVerifyRecordId] = useState("record-demo");
  const [grantResult, setGrantResult] = useState<string | null>(null);

  const handleGrant = async () => {
    if (!recordId.trim() || !clinicAddress.trim()) return;
    setGrantResult(null);
    const ok = await grantClinicAccess(recordId.trim(), clinicAddress.trim());
    setGrantResult(ok ? "Access granted." : "Failed.");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">HealthChain POC</h1>
          <p className="text-muted-foreground text-lg">
            Patient data exchange on Base L2: encrypted FHIR → IPFS → on-chain hash. Consent manager and clinic access.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <Card className="border-none shadow-sm bg-muted/20">
            <CardContent className="pt-6">
              <Link2 className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-bold mb-2">Create record</h3>
              <p className="text-sm text-muted-foreground mb-4">
                CHW creates record: encrypt FHIR → IPFS → hash + signature on-chain. Set VITE_HEALTH_CHAIN_POC_ADDRESS.
              </p>
              {!isConfigured && (
                <p className="text-xs text-muted-foreground italic">HealthChain not configured.</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-muted/20">
            <CardContent className="pt-6">
              <Shield className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-bold mb-2">Consent & access</h3>
              <p className="text-sm text-muted-foreground">
                Grant clinic access for verified import. Revoke consent when needed. Full audit trail.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Grant clinic access
            </CardTitle>
            <CardDescription>
              Enter record ID and clinic address to grant access. Requires connected wallet and HealthChain contract.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="recordId">Record ID</Label>
              <Input
                id="recordId"
                placeholder="record-123"
                value={recordId}
                onChange={(e) => setRecordId(e.target.value)}
                className="max-w-md"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="clinic">Clinic address</Label>
              <Input
                id="clinic"
                placeholder="0x..."
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                className="max-w-md"
              />
            </div>
            <Button
              onClick={handleGrant}
              disabled={!isConfigured || loading || !recordId.trim() || !clinicAddress.trim()}
              className="rounded-xl"
            >
              {loading ? "Granting…" : "Grant access"}
            </Button>
            {grantResult && (
              <p className={grantResult.startsWith("Access") ? "text-green-600 dark:text-green-400 text-sm" : "text-destructive text-sm"}>
                {grantResult}
              </p>
            )}
            {error && <p className="text-destructive text-sm">{error}</p>}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Verify & import record</CardTitle>
            <CardDescription>
              Clinic: verify on-chain record by ID (and optional AI report hash), then import FHIR.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 max-w-md">
              <Label htmlFor="verifyRecordId">Record ID to verify</Label>
              <Input
                id="verifyRecordId"
                value={verifyRecordId}
                onChange={(e) => setVerifyRecordId(e.target.value)}
              />
            </div>
            <VerifyHealthChainRecord
              recordId={verifyRecordId || "record-demo"}
              onVerified={(fhir) => fhir && console.log("FHIR loaded", fhir)}
            />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default HealthChainPage;
