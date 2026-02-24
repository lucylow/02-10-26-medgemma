import { ConnectButton } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config, chains } from "./config/wagmi";
import { DAOProvider, useDAO } from "./contexts/DAOContext";
import {
  ProposalList,
  CreateProposalForm,
  VotingPowerCard,
  TimelockStatus,
} from "./components/dao";
import "@rainbow-me/rainbowkit/styles.css";
import "./App.css";

const queryClient = new QueryClient();

function AppContent() {
  const { loading } = useDAO();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-gray-600">Loading PediScreen DAO...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="sticky top-0 z-50 border-b border-blue-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600">
                <span className="text-xl font-bold text-white">🩺</span>
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-2xl font-bold text-transparent">
                  PediScreen DAO
                </h1>
                <p className="text-sm text-gray-500">
                  Decentralized Pediatric Screening Governance
                </p>
              </div>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <VotingPowerCard />
            <TimelockStatus />
            <CreateProposalForm />
          </div>
          <div className="lg:col-span-2">
            <ProposalList />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
