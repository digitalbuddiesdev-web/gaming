import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "Terminal Login · Club-8910",
  description: "Secure operator back-office and player portal sign in.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="login-page-root">
      <main className="login-main-wrapper">
        <LoginForm error={error} />
      </main>
    </div>
  );
}
