import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";

export default async function Home() {
  const account = await currentAccount();
  if (!account) redirect("/login");
  redirect(account.role === "client" ? "/play" : "/admin");
}
