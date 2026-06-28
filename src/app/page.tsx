import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Building2,
  ClipboardCheck,
  GraduationCap,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: ClipboardCheck,
    title: "Attendance Management",
    description:
      "Mobile-friendly Sunday attendance with behavior tracking and bulk save.",
  },
  {
    icon: GraduationCap,
    title: "Student Management",
    description:
      "Global student records with per-year enrollments — never duplicate students.",
  },
  {
    icon: BookOpen,
    title: "Academic Tracking",
    description:
      "Quizzes, midterm projects, and final exams with weighted grade calculation.",
  },
  {
    icon: BarChart3,
    title: "Reporting",
    description:
      "Grade performance and individual report cards with CSV, Excel, and PDF export.",
  },
  {
    icon: Building2,
    title: "Multi-School Support",
    description:
      "Centralized administration for Faizan Weekend Islamic Schools nationwide.",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description:
      "Super Admin, School Admin, Teacher, and Read Only roles with secure permissions.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
              F
            </div>
            <div>
              <p className="font-semibold">FWIS</p>
              <p className="text-xs text-muted-foreground">
                Faizan Weekend Islamic School
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">
            Faizan Dawat-e-Islami
          </p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Nurturing Islamic Education Every Sunday
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            The Faizan Weekend Islamic School Management System helps schools
            across the nation manage students, teachers, attendance, academics,
            and reporting — all in one secure platform.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/login">Login to Dashboard</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="features" className="border-y bg-muted/30 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-10 text-center text-3xl font-bold">Features</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="pt-6">
                  <feature.icon className="mb-4 h-8 w-8 text-primary" />
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-6 text-center sm:grid-cols-3">
            {[
              { label: "Schools", value: "Multi-State" },
              { label: "Students", value: "Centralized Records" },
              { label: "Teachers", value: "Grade Assigned" },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="py-8">
                  <p className="text-3xl font-bold text-primary">{stat.value}</p>
                  <p className="mt-2 text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t bg-card">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center">
          <p className="font-semibold">Faizan Dawat-e-Islami</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Faizan Weekend Islamic School Management System
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Contact: info@faizan.org · Support for schools nationwide
          </p>
        </div>
      </footer>
    </div>
  );
}
