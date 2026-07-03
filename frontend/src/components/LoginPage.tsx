import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, ArrowRight, Layers, User, Lock, Eye, EyeOff, Mail, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  login,
  register,
  ensureSeedUser,
  isAuthenticated,
  DEMO_CREDENTIALS,
} from "../services/auth";

type Mode = "signin" | "register";

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");

  const [name, setName] = useState("");
  const [division, setDivision] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  // Seed the demo account, and skip the page entirely if already signed in.
  useEffect(() => {
    ensureSeedUser();
    if (isAuthenticated()) navigate("/workspace");
  }, [navigate]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrorMsg("");
    setInfoMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");
    setIsLoading(true);
    try {
      if (mode === "register") {
        await register({ email, password, name, division });
      } else {
        await login(email, password);
      }
      navigate("/workspace");
    } catch (err: any) {
      setErrorMsg(err?.message || "Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setErrorMsg("");
    setInfoMsg("");
    setIsLoading(true);
    try {
      await ensureSeedUser();
      await login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
      navigate("/workspace");
    } catch (err: any) {
      setErrorMsg(err?.message || "Demo sign-in failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans select-none antialiased">

      {/* Ambient background glows */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-slate-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-[150px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md"
      >
        {/* Brand identity */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center mb-3.5 shadow-xl border border-white/10">
            <Layers className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white font-display">FinIntel OS Console</h1>
          <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase mt-1">Classification: Secure Access</p>
        </div>

        {/* Login Card (Glassmorphic) */}
        <div className="glass-panel rounded-2xl p-6 md:p-8 shadow-2xl relative">

          <div className="absolute top-3 right-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest">Audit Mode Live</span>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-black/40 border border-white/10 rounded-lg p-0.5 mb-5 mt-1">
            {(["signin", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  mode === m ? "bg-white text-black" : "text-zinc-400 hover:text-white"
                }`}
              >
                {m === "signin" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <p className="text-xs text-zinc-400 font-light mb-6">
            {mode === "signin"
              ? "Enter your credentials to access the forensic database and workflow engine."
              : "Create an investigator account to access the forensic workspace."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Registration-only fields */}
            {mode === "register" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Investigator Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Agent Full Name"
                      className="w-full bg-black/60 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white duration-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Division (optional)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                      placeholder="AML Division"
                      className="w-full bg-black/60 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white duration-200"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Security ID (Email)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@agency.gov"
                  autoComplete="username"
                  className="w-full bg-black/60 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white duration-200"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Access Passcode</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "Min. 6 characters" : "••••••••••••"}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  className="w-full bg-black/60 border border-white/10 rounded-lg pl-9 pr-10 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <p className="text-[11px] text-red-400 font-medium bg-red-500/10 border border-red-500/20 rounded-md px-2.5 py-1.5">
                {errorMsg}
              </p>
            )}
            {infoMsg && (
              <p className="text-[11px] text-emerald-400 font-medium">{infoMsg}</p>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black hover:bg-neutral-200 font-bold py-3 rounded-lg text-xs transition duration-200 flex items-center justify-center gap-1.5 shadow-xl mt-2 cursor-pointer"
            >
              {isLoading ? (
                <span>{mode === "register" ? "Provisioning Account..." : "Verifying Access Keys..."}</span>
              ) : (
                <>
                  <span>{mode === "register" ? "Create Account" : "Decrypt Portal"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </form>

          {/* Demo Access Helper */}
          <div className="mt-6 pt-5 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono uppercase">
              <span>Demo Investigator Access</span>
            </div>

            <button
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="w-full p-3 bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/20 transition duration-200 rounded-lg text-left flex items-center justify-between group cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#18181B] flex items-center justify-center text-white text-[10px] font-bold">
                  AW
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-200 group-hover:text-white">Agent Willis</p>
                  <p className="text-[9px] text-zinc-500 font-mono">AML Division • Platform level 4</p>
                </div>
              </div>
              <Shield className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition duration-200" />
            </button>
          </div>

        </div>

        {/* Back Link to Marketing Landing Page */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/")}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 font-medium transition duration-150 cursor-pointer"
          >
            ← Return to public information page
          </button>
        </div>

      </motion.div>
    </div>
  );
}
