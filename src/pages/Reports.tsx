import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Reports() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <p className="text-sm text-muted-foreground">
            View and export screening reports
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Reports module coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
