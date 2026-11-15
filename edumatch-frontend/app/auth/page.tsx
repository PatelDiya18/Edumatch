"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLearnTwin } from "@/lib/learn-twin";
import { clearStoredProfileId } from "@/lib/profile-storage";

const API_URL = "/api/backend";

interface AuthResponse {
  token_type: string;
  has_profile: boolean;
  user: {
    id: number;
    email: string;
  };
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-[#0f0e17]" aria-busy="true" />}
    >
      <AuthContent />
    </Suspense>
  );
}

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const { resetTwin } = useLearnTwin();

  const [isLogin, setIsLogin] = useState(mode === "login");

  useEffect(() => {
    setIsLogin(mode === "login");
  }, [mode]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      const endpoint = isLogin
        ? "/auth/login"
        : "/auth/signup";

      const body = isLogin
        ? {
            email: email.trim().toLowerCase(),
            password,
          }
        : {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim().toLowerCase(),
            phone_number: phone.trim(),
            password,
          };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed.");
      }

      const result = data as AuthResponse;

      clearStoredProfileId();
      resetTwin();

      if (isLogin && result.has_profile) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }

    } catch (err) {
      console.error("AUTH ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to authenticate."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0e17] text-white flex items-center justify-center px-4 py-10">

      <div className="max-w-md w-full bg-[#1a1926] p-8 rounded-2xl border border-gray-800 shadow-xl">

        <div className="flex justify-between items-center mb-6 gap-3">

          <h2 className="text-2xl font-bold">
            {isLogin ? "Welcome Back" : "Start Learning Smarter"}
          </h2>

          <button
            type="button"
            onClick={() => {
              const nextIsLogin = !isLogin;
              setIsLogin(nextIsLogin);
              setError("");
              router.replace(
                `/auth?mode=${nextIsLogin ? "login" : "signup"}`,
                { scroll: false }
              );
            }}
            className="text-sm text-purple-400 hover:underline"
          >
            {isLogin ? "Sign Up" : "Log In"}
          </button>

        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-4">

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    First Name *
                  </label>

                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-[#0f0e17] border border-gray-700 rounded-lg p-3 text-sm"
                    placeholder="First name"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Last Name *
                  </label>

                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-[#0f0e17] border border-gray-700 rounded-lg p-3 text-sm"
                    placeholder="Last name"
                  />
                </div>

              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Phone Number *
                </label>

                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#0f0e17] border border-gray-700 rounded-lg p-3 text-sm"
                  placeholder="+91 98765 43210"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Email ID *
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0f0e17] border border-gray-700 rounded-lg p-3 text-sm"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Password *
            </label>

            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0f0e17] border border-gray-700 rounded-lg p-3 text-sm"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-3 rounded-lg font-medium"
          >
            {isSubmitting
              ? "Please wait..."
              : isLogin
                ? "Log In"
                : "Create Account"}
          </button>

        </form>
      </div>
    </div>
  );
}