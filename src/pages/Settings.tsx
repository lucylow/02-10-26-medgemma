import React from 'react';
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
  Lock
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Settings = () => {
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
