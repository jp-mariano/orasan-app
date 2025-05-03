import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Orasan App",
  description: "Privacy-first, open-source time tools.",
};

export default function Home() {
  return (
    <main className="h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-extrabold text-center">
        Orasan App, coming soon!
      </h1>
      <Link href="https://x.com/OrasanApp">
        <Button className="cursor-pointer text-xl font-extrabold text-center my-5">
          00:00
        </Button>
      </Link>
    </main>
  );
}
