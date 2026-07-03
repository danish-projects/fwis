"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createUser, getUserFormOptions } from "@/actions/users";
import { UserForm } from "@/components/users/user-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserInput } from "@/lib/validations/user";

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<
    Awaited<ReturnType<typeof getUserFormOptions>> | null
  >(null);

  useEffect(() => {
    getUserFormOptions().then((data) => {
      setOptions(data);
      setLoading(false);
    });
  }, []);

  async function handleSubmit(data: UserInput) {
    try {
      if (!data.password) {
        throw new Error("Password is required");
      }
      const user = await createUser({ ...data, password: data.password });
      toast.success("User created");
      router.push(`/users/${user.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create user");
      throw error;
    }
  }

  if (loading || !options) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add User</h1>
        <p className="text-muted-foreground">
          Create a login account with roles and school access
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm
            options={options}
            requirePassword
            onSubmit={handleSubmit}
            submitLabel="Create User"
            cancelHref="/users"
          />
        </CardContent>
      </Card>
    </div>
  );
}
