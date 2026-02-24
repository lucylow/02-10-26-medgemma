import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Smartphone, Watch, Activity, Moon, HeartPulse, Shield, Home, Video, ThermometerSun, Waves, ShieldCheck, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

const Wearables: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Watch className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Wearable & Home Data
            </h1>
            <p className="text-muted-foreground text-sm">
              Optional connection to Apple Health, Fitbit, and home devices to enrich screenings.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="rounded-full text-xs px-4 py-1">
          Optional • Off by default
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-black" />
              Apple Health
            </CardTitle>
            <CardDescription>
              Pulls heart rate, sleep, and activity summaries for children with approved sharing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Daily movement</span>
              <span className="font-medium">72%</span>
            </div>
            <Progress value={72} className="h-2" />
            <div className="flex items-center justify-between text-sm">
              <span>Sleep regularity</span>
              <span className="font-medium">82%</span>
            </div>
            <Progress value={82} className="h-2" />
            <Button variant="outline" className="mt-4 w-full rounded-xl">
              Connect Apple Health
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-600" />
              Movement & Sleep Summary
            </CardTitle>
            <CardDescription>
              Aggregated trends PediScreen AI can reference when interpreting parent observations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <HeartPulse className="w-4 h-4 text-rose-600" />
              <div>
                <p className="font-medium">Heart rate variability (HRV)</p>
                <p className="text-xs text-muted-foreground">
                  Helps flag changes in stress or illness alongside behavioral changes.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Moon className="w-4 h-4 text-indigo-600" />
              <div>
                <p className="font-medium">Sleep duration & quality</p>
                <p className="text-xs text-muted-foreground">
                  Night waking and short sleep can influence language and behavior.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="w-4 h-4 text-emerald-600" />
              <div>
                <p className="font-medium">Privacy & consent</p>
                <p className="text-xs text-muted-foreground">
                  Data is used only for the selected child and is never sold or shared for marketing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Home className="w-4 h-4 text-sky-600" />
              Passive home monitoring pipeline
            </CardTitle>
            <CardDescription>
              How a nursery camera or home device turns everyday moments into privacy-preserving summaries PediScreen can use.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 text-xs sm:text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1">
                  <Video className="w-3 h-3 text-sky-600" />
                  <span className="font-medium">Raw 1080p / 4K video</span>
                </div>
                <span className="hidden sm:inline text-muted-foreground">→</span>
                <span className="sm:hidden text-muted-foreground">to</span>
                <span className="text-muted-foreground">
                  stays on the Nest / Ring device and is never uploaded to PediScreen.
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1">
                  <Activity className="w-3 h-3 text-emerald-600" />
                  <span className="font-medium">Pose estimation (TFLite)</span>
                </div>
                <span className="hidden sm:inline text-muted-foreground">→</span>
                <span className="sm:hidden text-muted-foreground">to</span>
                <span className="text-muted-foreground">
                  lightweight edge model tracks trunk angle, head lift, rolling and cruising patterns.
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1">
                  <HeartPulse className="w-3 h-3 text-rose-600" />
                  <span className="font-medium">Motor features</span>
                </div>
                <span className="hidden sm:inline text-muted-foreground">→</span>
                <span className="sm:hidden text-muted-foreground">to</span>
                <span className="text-muted-foreground">
                  angle, velocity and posture summaries for tummy time, rolling, sitting and cruising.
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1">
                  <Shield className="w-3 h-3 text-emerald-700" />
                  <span className="font-medium">Milestone scoring (BIMS)</span>
                </div>
                <span className="hidden sm:inline text-muted-foreground">→</span>
                <span className="sm:hidden text-muted-foreground">to</span>
                <span className="text-muted-foreground">
                  PediScreen only receives percentile scores and flags like &quot;Monitor sitting progression&quot;.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ThermometerSun className="w-4 h-4 text-amber-600" />
              Weekly home summary (example)
            </CardTitle>
            <CardDescription className="text-xs">
              Fused view across nursery cam, doorbell and thermostat — designed for clinicians and parents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs sm:text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">VIDEO</span>
              <span className="text-muted-foreground">
                Tummy time 14 min/wk [P12], sitting attempts 3/10
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">AUDIO</span>
              <span className="text-muted-foreground">
                Babbling CV ratio 0.23 [P8 age-expected]
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">TEMP</span>
              <span className="text-muted-foreground">Nursery 72–76°F (optimal)</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[11px] border-amber-300 text-amber-800">
                Motor P&lt;20 + speech P&lt;20 → Screen recommended
              </Badge>
              <Badge variant="outline" className="text-[11px] border-emerald-300 text-emerald-800">
                Non-intrusive • No schedule changes
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Waves className="w-4 h-4 text-indigo-600" />
            Smart home devices with edge AI
          </CardTitle>
          <CardDescription className="text-xs">
            Leverages cameras and sensors many families already own — Ring, Nest, Ecobee and Amazon Sidewalk.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="space-y-1 rounded-xl border px-3 py-3 bg-muted/40">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Nest Cam (nursery)</span>
                <Badge variant="outline" className="text-[10px]">
                  Video + audio
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Detects person vs background, then runs pose estimation to spot tummy time, rolling and sitting.
              </p>
            </div>
            <div className="space-y-1 rounded-xl border px-3 py-3 bg-muted/40">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Ring doorbell</span>
                <Badge variant="outline" className="text-[10px]">
                  Motion
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Uses motion and face detection to understand when the child is at the door and model stranger anxiety over time.
              </p>
            </div>
            <div className="space-y-1 rounded-xl border px-3 py-3 bg-muted/40">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Ecobee thermostat</span>
                <Badge variant="outline" className="text-[10px]">
                  Mic + temp
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Local voice activity and cry pattern detection help separate hunger cries from distress, alongside room comfort.
              </p>
            </div>
            <div className="space-y-1 rounded-xl border px-3 py-3 bg-muted/40">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Amazon Sidewalk / mesh</span>
                <Badge variant="outline" className="text-[10px]">
                  Presence
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Low-power presence sensing builds a picture of typical room occupancy and activity patterns over weeks.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            Parental controls &amp; privacy
          </CardTitle>
          <CardDescription className="text-xs">
            All smart home integrations are strictly opt-in, edge-first, and can be turned off at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-xs sm:text-sm text-muted-foreground">
            <p>
              PediScreen never sees raw home video or audio. Devices run TensorFlow Lite models locally and send
              only milestone summaries and FHIR observations to the clinician portal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
            <label className="flex items-start gap-3 rounded-xl border px-3 py-3 bg-muted/40">
              <Checkbox className="mt-0.5" aria-label="Enable nursery cam analysis" />
              <div>
                <p className="font-medium">Analyze baby&apos;s motor patterns from nursery cam (local only)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Raw video stays on the device; PediScreen receives pose features and BIMS-style milestone scores.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-xl border px-3 py-3 bg-muted/40">
              <Checkbox className="mt-0.5" aria-label="Enable cry pattern summaries" />
              <div>
                <p className="font-medium">Summarize cry patterns from Ecobee mic</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Spectrogram features and MobileBERT scores only; no raw audio recordings are sent or stored centrally.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-xl border px-3 py-3 bg-muted/40">
              <Checkbox className="mt-0.5" aria-label="Enable auto-deletion" defaultChecked />
              <div>
                <p className="font-medium">Delete locally cached video after 24 hours</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Short-lived buffers support edge models while aligning with privacy and data minimization goals.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-xl border px-3 py-3 bg-muted/40">
              <Checkbox className="mt-0.5" aria-label="Enable face blurring" defaultChecked />
              <div>
                <p className="font-medium">Auto-blur faces before analysis</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Optional pre-processing step that blurs caregivers and siblings in the frame before pose estimation runs.
                </p>
              </div>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-muted/70 px-4 py-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>
                Alerts are raised when two or more domains (video + audio) fall below age norms (e.g., P&lt;10).
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Home alerts</span>
              <Switch defaultChecked aria-label="Toggle smart home alerts" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Wearables;

