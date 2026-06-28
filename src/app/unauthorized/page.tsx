import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="text-2xl font-bold">Unauthorized</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        You do not have permission to access this resource.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">Return to Dashboard</Link>
      </Button>
    </div>
  );
}
