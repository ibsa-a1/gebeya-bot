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

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nameError = submitted && !name.trim() ? "Enter your name" : null;
  const emailError = submitted
    ? !email
      ? "Enter your email"
      : !isValidEmail(email)
        ? "Enter a valid email address"
        : null
    : null;
  const passwordError = submitted
    ? !password
      ? "Enter a password"
      : password.length < 8
        ? "Password must be at least 8 characters"
        : null
    : null;
  const confirmError = submitted
    ? !confirmPassword
      ? "Confirm your password"
      : confirmPassword !== password
        ? "Passwords don't match"
        : null
    : null;

  const hasErrors = !!(nameError || emailError || passwordError || confirmError);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);

    if (
      !name.trim() ||
      !email ||
      !isValidEmail(email) ||
      !password ||
      password.length < 8 ||
      confirmPassword !== password
    ) {
      return;
    }

    setLoading(true);
    try {
      await signup(email, password, name);
      router.push("/products");
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setServerError(typeof message === "string" ? message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-8">
      <h1 className="text-xl font-semibold text-ink">Create your account</h1>
      <p className="mt-1 text-sm text-ink/60">Set up your storefront in minutes</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <Input
          label="Full name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={nameError ?? undefined}
        />
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordError ?? undefined}
        />
        <PasswordInput
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={confirmError ?? undefined}
        />
        {serverError && <p className="text-sm text-signal-red">{serverError}</p>}
        <Button type="submit" loading={loading} className="mt-2 w-full">
          Create account
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-ink/40">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <TelegramLoginButton />

      <p className="mt-6 text-center text-sm text-ink/60">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
