import { LoginForm } from "./_components/LoginForm";

export default function LoginPage() {
  return (
    <main
      className="flex min-h-screen items-center justify-center p-6 font-sans"
      style={{ background: "radial-gradient(120% 80% at 50% -10%, var(--ac-bg), var(--bg) 60%)" }}
    >
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <span className="flex size-[34px] items-center justify-center rounded-[9px] bg-accent text-[18px] font-bold text-white">
            ★
          </span>
          <span className="text-[20px] font-semibold tracking-tight text-ink">5stars</span>
        </div>

        {/* Card */}
        <div className="rounded-[16px] border border-line bg-card p-7 shadow-[0_8px_30px_-12px_rgba(20,20,40,0.12)]">
          <h1 className="mb-1 text-[21px] font-semibold tracking-tight text-ink">Iniciá sesión</h1>
          <p className="mb-5 text-body text-ink-2">Bienvenido de nuevo a tu panel.</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
