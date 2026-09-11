import { LoginForm } from "@/components/auth/login-form";
import { Logo, Wordmark } from "@/components/ui/logo";

export default function LoginPage() {
  return (
    <main className="flex min-h-full items-center justify-center px-5 py-16">
      <div className="w-full max-w-md rounded-[18px] border border-line bg-elevated p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={48} className="mb-3" />
          <h1>
            <Wordmark />
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Sign in to your second brain
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
