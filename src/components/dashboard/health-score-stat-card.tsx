import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HealthScoreStatCard({ value }: { value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Avg Health Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
