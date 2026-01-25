// app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  // Automatically send users to the TestCase Manager
  redirect("/dashboard");
}