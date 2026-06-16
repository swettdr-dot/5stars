import { signIn } from "@/lib/auth";

export default function LoginPage() {
  async function login(formData: FormData) {
    "use server";
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/super",
    });
  }
  return (
    <main className="mx-auto mt-24 max-w-sm p-6">
      <h1 className="mb-6 text-2xl font-bold">Iniciar sesión</h1>
      <form action={login} className="space-y-4">
        <input name="email" type="email" placeholder="Correo"
          className="w-full rounded border p-2" required />
        <input name="password" type="password" placeholder="Contraseña"
          className="w-full rounded border p-2" required />
        <button className="w-full rounded bg-black p-2 text-white">Entrar</button>
      </form>
    </main>
  );
}
