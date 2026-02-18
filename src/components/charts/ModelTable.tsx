import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ModelRow {
  model_id: string;
  provider: string;
  calls: number;
  avg_latency_ms: number;
  error_rate: number;
  fallback_rate: number;
  cost_estimate_usd: number;
  adapters: string[];
  last_used: string;
}

interface ModelTableProps {
  models: ModelRow[];
  title?: string;
}

export function ModelTable({ models, title = "Model Breakdown" }: ModelTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {models.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Calls</TableHead>
                <TableHead className="text-right">Avg Latency</TableHead>
                <TableHead className="text-right">Error Rate</TableHead>
                <TableHead className="text-right">Fallback Rate</TableHead>
                <TableHead className="text-right">Est. Cost</TableHead>
                <TableHead>Adapters</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((m) => (
                <TableRow key={m.model_id}>
                  <TableCell className="font-medium">{m.model_id}</TableCell>
                  <TableCell>{m.provider}</TableCell>
                  <TableCell className="text-right">{m.calls}</TableCell>
                  <TableCell className="text-right">{m.avg_latency_ms}ms</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={m.error_rate > 5 ? "destructive" : "secondary"}>
                      {m.error_rate}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={m.fallback_rate > 10 ? "outline" : "secondary"}>
                      {m.fallback_rate}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">${m.cost_estimate_usd.toFixed(4)}</TableCell>
                  <TableCell>
                    {m.adapters.map((a) => (
                      <Badge key={a} variant="outline" className="mr-1 text-xs">
                        {a}
                      </Badge>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center py-8">No model data for this period.</p>
        )}
      </CardContent>
    </Card>
  );
}
