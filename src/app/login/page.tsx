import { Icon } from "@/components/ui/icon";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-full items-center justify-center px-5 py-16">
      <div className="w-full max-w-md rounded-[18px] border border-line bg-elevated p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-brand text-white shadow-[0_2px_8px_rgba(255,102,0,0.25)]">
            <Icon name="bolt" size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Supersynapse</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Sign in to your second brain
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
