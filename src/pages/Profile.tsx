import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Profile() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Account</h1>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage your account settings
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Profile management will be available after authentication is implemented.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
