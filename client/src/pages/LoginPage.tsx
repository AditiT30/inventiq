import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { LockKeyhole, UserRound } from "lucide-react";

import { isAuthenticated, login } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [serverError, setServerError] = useState("");

  const redirectTo =
    searchParams.get("redirect") ??
    (location.state as { from?: string } | null)?.from ??
    "/";
  const reason = searchParams.get("reason");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  if (isAuthenticated()) {
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setServerError("");
      await login(values.username, values.password);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Login failed");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_25%),linear-gradient(180deg,#020817_0%,#020617_100%)] px-6 py-10 text-white">
      <Card className="w-full max-w-md border border-white/10 bg-slate-950/80 py-0 shadow-[0_24px_90px_rgba(2,8,23,0.45)]">
        <CardHeader className="px-6 pt-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-amber-100">
            <LockKeyhole className="size-3.5" />
            Secure access
          </div>
          <CardTitle className="pt-5 text-3xl font-semibold text-white">Sign in to Inventiq</CardTitle>
          <CardDescription className="pt-2 text-sm leading-7 text-slate-400">
            Use your configured app credentials to access inventory, sales, purchases, and manufacturing data.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300" htmlFor="username">
                Username
              </label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="username"
                  {...register("username")}
                  className="h-11 rounded-2xl border-white/10 bg-white/[0.03] pl-10 text-white placeholder:text-slate-500"
                  placeholder="Enter your username"
                />
              </div>
              {errors.username ? <p className="text-sm text-rose-300">{errors.username.message}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                  className="h-11 rounded-2xl border-white/10 bg-white/[0.03] pl-10 text-white placeholder:text-slate-500"
                  placeholder="Enter your password"
                />
              </div>
              {errors.password ? <p className="text-sm text-rose-300">{errors.password.message}</p> : null}
            </div>

            {serverError ? (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
                {serverError}
              </div>
            ) : null}

            {!serverError && reason === "session-expired" ? (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                Your session expired. Sign in again to continue where you left off.
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full rounded-2xl bg-amber-300 text-sm font-semibold text-slate-950 hover:bg-amber-200"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default LoginPage;
