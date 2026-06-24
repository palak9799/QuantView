import React, { useState } from "react";
import { UserProfile } from "../types";

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage("Please enter your email and password.");
      return;
    }

    if (password.length < 5) {
      setErrorMessage("Password must contain at least 5 characters.");
      return;
    }

    // Capture name from the email
    const emailPrefix = email.split("@")[0] || "Candidate";
    const beautifiedName = emailPrefix.split(".")
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    // Initialize clean UserProfile matching professional metrics
    const defaultProfile: UserProfile = {
      name: beautifiedName,
      email: email.trim(),
      targetRole: "Software Engineer",
      experienceLevel: "Junior",
      targetIndustry: "Digital Technology",
      joinedDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" }),
      currentLevel: 1,
      xpPoints: 0,
      completedLevels: [],
      badges: [],
      streakCount: 1,
      unlockAllLevels: true,
      progressionModeEnabled: false,
    };

    // Save profile locally and complete onboarding login
    onComplete(defaultProfile);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Subtle modern background grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-40" />
      <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[140px] pointer-events-none opacity-40" />
      <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/20 rounded-full blur-[120px] pointer-events-none opacity-40" />

      {/* Centered Login Card */}
      <div className="flex-grow flex flex-col items-center justify-center relative z-20 px-6 py-12">
        <div className="w-full max-w-sm text-center space-y-6">
          
          {/* Logo/title at the top */}
          <div className="flex flex-col items-center space-y-3">
            <div id="quantview-logo" className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="font-black text-white tracking-tighter text-xl">Q</span>
            </div>
            <h1 id="quantview-title" className="text-2xl font-bold tracking-tight text-white">
              QuantView
            </h1>
          </div>

          {/* Secure Credentials Login Panel */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-2xl shadow-slate-950/45 text-left text-slate-900">
            
            <div className="space-y-5">
              {errorMessage && (
                <div id="auth-error-banner" className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-650 font-medium">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                
                {/* Email Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    placeholder="name@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all placeholder:text-slate-400 font-medium"
                  />
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all placeholder:text-slate-400 font-medium"
                  />
                </div>

                {/* Action Submit */}
                <div className="pt-2">
                  <button
                    id="submit-auth-btn"
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs sm:text-sm transition-all duration-150 flex items-center justify-center cursor-pointer shadow-md shadow-blue-500/10"
                  >
                    <span>Login</span>
                  </button>
                </div>

              </form>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
