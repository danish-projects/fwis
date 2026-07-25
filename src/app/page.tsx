import Image from "next/image";
import Link from "next/link";
import { BookOpen, HeartHandshake, MapPin, Phone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const syllabus = [
  "The fundamentals of Islam",
  "Biographies of Prophets عليهم السلام",
  "Sunnahs",
  "Duas and much more",
];

const branches = [
  {
    name: "Faizan-e-Madinah Chicago",
    address: "6821 N Western Ave., Chicago, IL 60645",
    phone: "(773) 789-9226",
    phoneHref: "tel:+17737899226",
  },
  {
    name: "Faizan-e-Madinah Sacramento",
    address: "4110 North Freeway Blvd., Sacramento, CA 95834",
    phone: "(916) 649-2526",
    phoneHref: "tel:+19166492526",
  },
  {
    name: "Faizan-e-Madinah Lilburn",
    address: "4991 Burns Rd. NW, Lilburn, GA 30047",
    phone: "(203) 917-8224",
    phoneHref: "tel:+12039178224",
  },
  {
    name: "Faizan-e-Madinah Sugar Land",
    address: "13130 Alston Rd., Sugar Land, TX 77478",
    phone: "(413) 353-2626",
    phoneHref: "tel:+14133532626",
  },
];

const platformHighlights = [
  {
    title: "Sunday operations",
    description: "Attendance, behavior, and assessments for every weekend session.",
  },
  {
    title: "Campus-wide records",
    description: "Students, enrollments, teachers, and calendars in one secure system.",
  },
  {
    title: "Role-based access",
    description: "Principals, section admins, and teachers see only their scope.",
  },
];

export default function HomePage() {
  return (
    <div className="landing-page min-h-screen overflow-x-hidden bg-[var(--landing-bg)] text-[var(--landing-ink)]">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--landing-green)] font-[family-name:var(--font-landing-display)] text-lg font-semibold text-white shadow-[0_0_24px_rgba(0,103,56,0.4)]">
              F
            </div>
            <div>
              <p className="font-[family-name:var(--font-landing-display)] text-xl leading-none tracking-wide text-white">
                FWIS
              </p>
              <p className="mt-1 text-xs text-white/70">Faizan Weekend Islamic School</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="hidden text-white hover:bg-white/10 hover:text-white sm:inline-flex"
            >
              <a
                href="https://www.dawateislamiusa.org/faizan-weekend-islamic-school"
                target="_blank"
                rel="noopener noreferrer"
              >
                About FWIS
              </a>
            </Button>
            <Button
              asChild
              className="bg-[var(--landing-green)] text-white hover:bg-[var(--landing-green-hover)]"
            >
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative flex min-h-[100svh] items-end overflow-hidden bg-[var(--landing-bg)]">
        <Image
          src="/images/fwis-landing-hero.png"
          alt="Quiet classroom prepared for Faizan Weekend Islamic School"
          fill
          priority
          className="object-cover object-center opacity-45"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--landing-bg)] via-[var(--landing-bg)]/85 to-[var(--landing-bg)]/55" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,103,56,0.28),transparent_55%)]" />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-28 sm:px-6 sm:pb-20 md:pb-24">
          <p className="landing-fade-up mb-4 max-w-xl font-[family-name:var(--font-landing-display)] text-3xl text-[var(--landing-green)] sm:text-4xl md:text-5xl">
            Faizan Weekend Islamic School
          </p>
          <h1 className="landing-fade-up landing-delay-1 max-w-3xl font-[family-name:var(--font-landing-display)] text-4xl leading-[1.05] text-white sm:text-5xl md:text-6xl">
            Empowering the next generation with a deep understanding of Islam
          </h1>
          <p className="landing-fade-up landing-delay-2 mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
            Commonly known as Sunday School — free weekend religious education for
            students with weekday obligations, rooted in Islamic values and heritage.
          </p>
          <div className="landing-fade-up landing-delay-3 mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-[var(--landing-green)] text-white hover:bg-[var(--landing-green-hover)]"
            >
              <Link href="/login">Login to Dashboard</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <a href="#mission">Our mission</a>
            </Button>
          </div>
        </div>
      </section>

      <section id="mission" className="relative border-b border-[var(--landing-line)] bg-[var(--landing-bg)] py-16 md:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(0,103,56,0.14),transparent_45%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--landing-green)]">
              About the school
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-landing-display)] text-3xl leading-tight text-white md:text-4xl">
              A Dawat-e-Islami USA initiative for young minds
            </h2>
            <p className="mt-5 text-base leading-relaxed text-[var(--landing-muted)] md:text-lg">
              The Faizan Weekend Islamic School is a committed initiative designed to
              empower the next generation with a deep understanding of Islam. Tailored
              for students with weekday obligations, this program operates primarily on
              weekends, offering free religious education to students attending public
              schools.
            </p>
            <p className="mt-4 text-base leading-relaxed text-[var(--landing-muted)] md:text-lg">
              It provides a strong foundation in Islamic values and teaches students
              about their rich heritage — preparing them to become responsible and
              compassionate individuals.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-[var(--landing-line)] bg-[var(--landing-surface)] p-6">
              <HeartHandshake className="h-7 w-7 text-[var(--landing-green)]" />
              <h3 className="mt-4 font-[family-name:var(--font-landing-display)] text-xl text-white">
                Beyond religious education
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--landing-muted)]">
                FWIS instills a strong moral compass, nurturing young minds with the
                knowledge needed to navigate today&apos;s world with faith and character.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--landing-green)]/50 bg-[var(--landing-green)] p-6 text-white">
              <Sparkles className="h-7 w-7 text-white" />
              <h3 className="mt-4 font-[family-name:var(--font-landing-display)] text-xl">
                Contemporary tools, timeless values
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/90">
                Our mission is to utilize contemporary tools and interactive technology
                to inspire and educate the younger generation for the future.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="syllabus" className="border-b border-[var(--landing-line)] bg-[var(--landing-panel)] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--landing-green)]">
              Syllabus
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-landing-display)] text-3xl text-white md:text-4xl">
              What we cover
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--landing-muted)]">
              Students build a living connection to faith through foundational knowledge,
              prophetic example, and daily practice.
            </p>
          </div>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {syllabus.map((item, index) => (
              <li
                key={item}
                className="landing-rise flex items-start gap-4 rounded-2xl border border-[var(--landing-line)] bg-[var(--landing-surface)] px-5 py-5"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--landing-green)]/20 text-[var(--landing-green)]">
                  <BookOpen className="h-4 w-4" />
                </span>
                <span className="pt-1.5 text-base font-medium leading-snug text-white">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="branches" className="border-b border-[var(--landing-line)] bg-[var(--landing-bg)] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--landing-green)]">
                Branches
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-landing-display)] text-3xl text-white md:text-4xl">
                Faizan-e-Madinah centers across the USA
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--landing-muted)]">
                Visit a welcoming center near you and experience the beauty of Islam in an
                inclusive environment.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="border-[var(--landing-green)] bg-transparent text-[var(--landing-green)] hover:bg-[var(--landing-green)] hover:text-white"
            >
              <a
                href="https://www.dawateislamiusa.org/faizan-weekend-islamic-school"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Dawat-e-Islami USA
              </a>
            </Button>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {branches.map((branch) => (
              <article
                key={branch.name}
                className="rounded-2xl border border-[var(--landing-line)] bg-[var(--landing-surface)] p-6 transition duration-300 hover:border-[var(--landing-green)]/50"
              >
                <h3 className="font-[family-name:var(--font-landing-display)] text-xl text-[var(--landing-green)]">
                  {branch.name}
                </h3>
                <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-[var(--landing-muted)]">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--landing-green)]" />
                  {branch.address}
                </p>
                <a
                  href={branch.phoneHref}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-white hover:text-[var(--landing-green)] hover:underline"
                >
                  <Phone className="h-4 w-4 text-[var(--landing-green)]" />
                  {branch.phone}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="platform"
        className="border-b border-[var(--landing-line)] bg-[var(--landing-panel)] py-16 md:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--landing-green)]">
              Staff portal
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-landing-display)] text-3xl text-white md:text-4xl">
              The FWIS management system for Sunday schools
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--landing-muted)]">
              Principals, admins, and teachers use this secure platform to run weekend
              school operations — from enrollment through final grades.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {platformHighlights.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[var(--landing-line)] bg-[var(--landing-surface)] p-6"
              >
                <h3 className="font-[family-name:var(--font-landing-display)] text-xl text-[var(--landing-green)]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--landing-muted)]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <Button
              asChild
              size="lg"
              className="bg-[var(--landing-green)] text-white hover:bg-[var(--landing-green-hover)]"
            >
              <Link href="/login">Sign in to FWIS</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--landing-line)] bg-[var(--landing-bg)] py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm text-[var(--landing-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-[family-name:var(--font-landing-display)] text-lg text-white">
              Faizan Weekend Islamic School
            </p>
            <p className="mt-1">A Dawat-e-Islami USA initiative</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <a
              href="https://www.dawateislamiusa.org/faizan-weekend-islamic-school"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--landing-green)] hover:underline"
            >
              dawateislamiusa.org/faizan-weekend-islamic-school
            </a>
            <p>Staff portal · Secure school management</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
