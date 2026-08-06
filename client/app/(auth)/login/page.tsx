"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../hooks/useAuth";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { PasswordInput } from "../../../components/ui/PasswordInput";
import { Card } from "../../../components/ui/Card";
import { TelegramLoginButton } from "../../../components/auth/TelegramLoginButton";
import { isValidEmail } from "../../../lib/validation";

export default function LoginPage() {
  const { loginWithPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailError = submitted
    ? !email
      ? "Enter your email"
      : !isValidEmail(email)
        ? "Enter a valid email address"
        : null
    : null;
  const passwordError = submitted && !password ? "Enter your password" : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);

    if (!email || !isValidEmail(email) || !password) return;

    setLoading(true);
    try {
      await loginWithPassword(email, password);
      router.push("/products");
    } catch {
      setServerError("That email and password don't match. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-8">
      <h1 className="text-xl font-semibold text-ink">Log in</h1>
      <p className="mt-1 text-sm text-ink/60">Manage your storefront</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError ?? undefined}
        />
        <PasswordInput
          label="Password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordError ?? undefined}
        />
        {serverError && <p className="text-sm text-signal-red">{serverError}</p>}
        <Button type="submit" loading={loading} className="mt-2 w-full">
          Log in
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-ink/40">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <TelegramLoginButton />

      <p className="mt-6 text-center text-sm text-ink/60">
        No account yet?{" "}
        <Link href="/signup" className="font-medium text-indigo hover:underline">
          Sign up
        </Link>
      </p>
    </Card>
  );
}
