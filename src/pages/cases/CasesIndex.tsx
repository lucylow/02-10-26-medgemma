import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listCases } from "@/services/cases";
import { FolderOpen, Plus } from "lucide-react";

export default function CasesIndex() {
  const { data, isLoading } = useQuery({
    queryKey: ["cases"],
    queryFn: () => listCases({ limit: 20, page: 0 }),
  });

  const items = data?.items ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Case Queue</h1>
        <Link to="/pediscreen/screening">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Screening
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading cases...
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center gap-4">
            <FolderOpen className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">No cases yet</p>
            <Link to="/pediscreen/screening">
              <Button>Start a screening</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link key={item.id} to={`/cases/${item.screening_id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Case {item.screening_id.slice(0, 8)}...
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {item.domain ?? "General"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="py-0 pb-3">
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {item.observations ?? "No observations"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
