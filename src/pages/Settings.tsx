import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  User, 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Smartphone, 
  Cloud, 
  Database,
  Globe,
  Moon,
  Sun,
  Lock,
  Wallet
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isAnalyticsOptedIn, setAnalyticsOptIn } from '@/analytics';
import { ConnectWalletButton, FedLearningClient } from '@/components/blockchain';
import { isBlockchainConfigured } from '@/config/blockchain';
import { exportData, eraseData, rectifyData } from '@/api/dsr';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const [analyticsOptIn, setAnalyticsOptInState] = useState(false);
  const [dsrCaseId, setDsrCaseId] = useState('');
  const [dsrRectifyField, setDsrRectifyField] = useState('observations');
  const [dsrRectifyValue, setDsrRectifyValue] = useState('');
  const [dsrLoading, setDsrLoading] = useState<'export' | 'erase' | 'rectify' | null>(null);
  const { toast } = useToast();
  useEffect(() => {
    setAnalyticsOptInState(isAnalyticsOptedIn());
  }, []);

  const handleAnalyticsChange = (checked: boolean) => {
    setAnalyticsOptIn(checked);
    setAnalyticsOptInState(checked);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your application preferences and data.</p>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="general" className="rounded-lg gap-2">
              <Smartphone className="w-4 h-4" /> General
            </TabsTrigger>
            <TabsTrigger value="ai" className="rounded-lg gap-2">
              <Cloud className="w-4 h-4" /> AI & Inference
            </TabsTrigger>
            <TabsTrigger value="privacy" className="rounded-lg gap-2">
              <Shield className="w-4 h-4" /> Privacy & Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-lg gap-2">
              <Bell className="w-4 h-4" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="blockchain" className="rounded-lg gap-2">
              <Wallet className="w-4 h-4" /> Blockchain
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Configure basic application behavior and appearance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">Switch between light and dark themes.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-muted-foreground" />
                    <Switch />
                    <Moon className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Language</Label>
                    <p className="text-sm text-muted-foreground">Select your preferred language.</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Globe className="w-4 h-4" /> English (US)
                  </Button>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="clinician-id">Clinician/Caregiver ID (Optional)</Label>
                  <Input id="clinician-id" placeholder="Enter ID for reporting" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle>AI & Inference Configuration</CardTitle>
                <CardDescription>Control how MedGemma and other models process data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">On-Device Inference</Label>
                    <p className="text-sm text-muted-foreground">Run models locally on this device for maximum privacy.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Cloud Fallback</Label>
                    <p className="text-sm text-muted-foreground">Use cloud API if local hardware is insufficient.</p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Model Precision</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" className="text-xs">4-bit (Fastest)</Button>
                    <Button variant="default" className="text-xs">8-bit (Balanced)</Button>
                    <Button variant="outline" className="text-xs">FP16 (Precise)</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Data Security</CardTitle>
                <CardDescription>Manage your data and how it's stored.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Analytics (opt-in)</Label>
                    <p className="text-sm text-muted-foreground">Allow anonymous usage analytics to improve the product. GDPR-compliant; you can change this anytime.</p>
                  </div>
                  <Switch checked={analyticsOptIn} onCheckedChange={handleAnalyticsChange} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Local Data Encryption</Label>
                    <p className="text-sm text-muted-foreground">Encrypt all screening data stored on this device.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Automatic Data Purge</Label>
                    <p className="text-sm text-muted-foreground">Delete screening data after 30 days of inactivity.</p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="space-y-4">
                  <p className="text-sm font-medium text-foreground">Data rights (GDPR)</p>
                  <p className="text-xs text-muted-foreground">
                    Export your data, request erasure, or request correction. Requires API key.
                  </p>
                  <div className="space-y-2">
                    <Label>Case or user ID</Label>
                    <Input
                      placeholder="Case ID or pseudonymized user ID"
                      value={dsrCaseId}
                      onChange={(e) => setDsrCaseId(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={!dsrCaseId || dsrLoading !== null}
                      onClick={async () => {
                        setDsrLoading('export');
                        try {
                          const blob = await exportData(
                            dsrCaseId.length > 20 ? { case_id: dsrCaseId } : { user_id: dsrCaseId }
                          );
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'dsr_export.zip';
                          a.click();
                          URL.revokeObjectURL(url);
                          toast({ title: 'Export started', description: 'dsr_export.zip downloaded.' });
                        } catch (e) {
                          toast({
                            title: 'Export failed',
                            description: e instanceof Error ? e.message : 'Unknown error',
                            variant: 'destructive',
                          });
                        } finally {
                          setDsrLoading(null);
                        }
                      }}
                    >
                      {dsrLoading === 'export' ? 'Exporting…' : 'Export my data'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-destructive"
                      disabled={!dsrCaseId || dsrLoading !== null}
                      onClick={async () => {
                        if (!confirm('Permanently erase data for this case/user? This cannot be undone.')) return;
                        setDsrLoading('erase');
                        try {
                          const res = await eraseData(
                            dsrCaseId.length > 20 ? { case_id: dsrCaseId } : { user_id: dsrCaseId }
                          );
                          toast({
                            title: 'Erasure complete',
                            description: `${res.deleted_count} record(s) marked deleted.`,
                          });
                        } catch (e) {
                          toast({
                            title: 'Erasure failed',
                            description: e instanceof Error ? e.message : 'Unknown error',
                            variant: 'destructive',
                          });
                        } finally {
                          setDsrLoading(null);
                        }
                      }}
                    >
                      {dsrLoading === 'erase' ? 'Erasing…' : 'Request deletion'}
                    </Button>
                  </div>
                  <div className="pt-2 border-t space-y-2">
                    <Label>Request correction (case ID + field + new value)</Label>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        placeholder="Field (e.g. observations)"
                        value={dsrRectifyField}
                        onChange={(e) => setDsrRectifyField(e.target.value)}
                        className="max-w-[140px]"
                      />
                      <Input
                        placeholder="New value"
                        value={dsrRectifyValue}
                        onChange={(e) => setDsrRectifyValue(e.target.value)}
                        className="flex-1 min-w-[120px]"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!dsrCaseId || !dsrRectifyValue || dsrLoading !== null}
                        onClick={async () => {
                          setDsrLoading('rectify');
                          try {
                            await rectifyData({
                              case_id: dsrCaseId,
                              field: dsrRectifyField,
                              new_value: dsrRectifyValue,
                            });
                            toast({
                              title: 'Request logged',
                              description: 'Clinician review required for correction.',
                            });
                          } catch (e) {
                            toast({
                              title: 'Request failed',
                              description: e instanceof Error ? e.message : 'Unknown error',
                              variant: 'destructive',
                            });
                          } finally {
                            setDsrLoading(null);
                          }}
                        }}
                      >
                        {dsrLoading === 'rectify' ? 'Sending…' : 'Request correction'}
                      </Button>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <Button variant="destructive" className="w-full gap-2">
                    <Database className="w-4 h-4" /> Clear All Local Data
                  </Button>
                  <Button variant="outline" className="w-full gap-2">
                    <Lock className="w-4 h-4" /> Export Audit Log
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Stay updated on screening follow-ups and system alerts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Screening Reminders</Label>
                    <p className="text-sm text-muted-foreground">Get notified when a follow-up screening is recommended.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">System Updates</Label>
                    <p className="text-sm text-muted-foreground">Notifications about new clinical guidelines or model updates.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blockchain">
            <Card>
              <CardHeader>
                <CardTitle>Blockchain & Wallet</CardTitle>
                <CardDescription>
                  Connect a wallet for on-chain screening records, HealthChain POC, and federated learning rewards. Optional.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-base">Wallet</Label>
                  <p className="text-sm text-muted-foreground">Connect MetaMask or another Web3 wallet to mint screening NFTs and use HealthChain.</p>
                  <ConnectWalletButton />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-base">Federated learning</Label>
                  <p className="text-sm text-muted-foreground">Register as a client and submit gradient hashes to earn $PEDI (when configured).</p>
                  <FedLearningClient />
                </div>
                {!isBlockchainConfigured && (
                  <>
                    <Separator />
                    <p className="text-sm text-muted-foreground">
                      Blockchain is not configured. Set VITE_PEDISCREEN_REGISTRY_ADDRESS, VITE_HEALTH_CHAIN_POC_ADDRESS, or VITE_FED_COORDINATOR_ADDRESS in your environment. See docs/BLOCKCHAIN_INTEGRATION.md in the repo.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end gap-3">
          <Button variant="outline" className="rounded-xl">Cancel</Button>
          <Button className="rounded-xl px-8">Save Changes</Button>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;
