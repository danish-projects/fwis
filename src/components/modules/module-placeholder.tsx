import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ModulePlaceholderProps = {
  title: string;
  description: string;
};

export function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Module Ready</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Database schema, permissions, and navigation are configured. Connect
          Supabase and run migrations to activate full CRUD for this module.
        </CardContent>
      </Card>
    </div>
  );
}
