import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, UserPlus, ShieldCheck, Stethoscope, UserCog } from "lucide-react";

const TEAM_MEMBERS = [
  { name: "Dr. Rivera", role: "Pediatrician", initials: "DR", type: "clinician" as const },
  { name: "Jordan Lee", role: "Developmental therapist", initials: "JL", type: "clinician" as const },
  { name: "Sam Patel", role: "Community health worker", initials: "SP", type: "chw" as const },
  { name: "Alex Kim", role: "Clinic coordinator", initials: "AK", type: "admin" as const },
];

const roleColor: Record<string, string> = {
  clinician: "bg-sky-100 text-sky-700",
  chw: "bg-emerald-100 text-emerald-700",
  admin: "bg-violet-100 text-violet-700",
};

const TeamManagement: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Team & Permissions
            </h1>
            <p className="text-muted-foreground text-sm">
              Clinicians, CHWs, and admins working together around shared pediatric data.
            </p>
          </div>
        </div>
        <Button className="rounded-xl gap-2">
          <UserPlus className="w-4 h-4" />
          Invite teammate
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Team roster</CardTitle>
            <CardDescription>Example roles and access levels for this demo clinic.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {TEAM_MEMBERS.map((m) => (
              <div
                key={m.name}
                className="flex items-center justify-between gap-3 border rounded-xl px-3 py-2 bg-card/60"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{m.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[11px] border-0 ${roleColor[m.type] ?? ""}`}
                  >
                    {m.type === "clinician" && "Clinician"}
                    {m.type === "chw" && "CHW"}
                    {m.type === "admin" && "Admin"}
                  </Badge>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg">
                    <UserCog className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Access model
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>
              <strong>Clinicians</strong> can view and sign off on reports, configure model behavior,
              and export summaries.
            </p>
            <p>
              <strong>CHWs</strong> can start screenings, capture observations, and share parent
              summaries.
            </p>
            <p>
              <strong>Admins</strong> manage invite links, audit logs, and EHR connections.
            </p>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              <Stethoscope className="w-4 h-4" />
              Clinical sign-off is always required before results are added to the medical record.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamManagement;

