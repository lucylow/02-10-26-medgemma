/**
 * Federated Learning page — privacy-preserving training, $PEDI rewards, client registration.
 */
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FedLearningClient } from "@/components/blockchain";
import { Lock, Cpu, Coins, ArrowRight, Shield } from "lucide-react";

const FederatedLearningPage = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">Federated Learning</h1>
          <p className="text-muted-foreground text-lg">
            Train MedGemma LoRA locally. No raw data leaves your device. Earn $PEDI for contributing.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <Card className="border-none shadow-sm bg-muted/20">
            <CardContent className="pt-6">
              <Lock className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-bold mb-2">Privacy-first</h3>
              <p className="text-sm text-muted-foreground">
                Hospitals and CHWs train on local data. Only gradient hashes are aggregated; differential privacy (ε=1.0) applied.
              </p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-muted/20">
            <CardContent className="pt-6">
              <Cpu className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-bold mb-2">Flower clients</h3>
              <p className="text-sm text-muted-foreground">
                Register as a client, run training locally, and submit gradient hashes to the FedAvg server.
              </p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-muted/20">
            <CardContent className="pt-6">
              <Coins className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-bold mb-2">$PEDI rewards</h3>
              <p className="text-sm text-muted-foreground">
                Earn 10 $PEDI per datapoint. Connect wallet and deploy on Polygon Amoy to participate.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Client control panel
            </CardTitle>
            <CardDescription>
              Register your client and submit gradient hashes. Requires VITE_FED_COORDINATOR_ADDRESS and wallet connection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FedLearningClient />
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowRight className="w-4 h-4" />
          <span>See docs: FEDERATED_LEARNING.md and contracts (PediScreenFedCoordinator, PEDIRewardToken).</span>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default FederatedLearningPage;
