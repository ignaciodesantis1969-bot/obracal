import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2 } from "lucide-react";
import logoSice from "@/assets/LogoSICESA.jpg";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase";

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (onLoginSuccess) {
        onLoginSuccess(userCredential.user);
      }
    } catch (err) {
      console.error(err);
      setError("Correo o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070e1b] flex flex-col items-center justify-center p-4">
      {/* Contenedor optimizado con menos padding para que el logo se vea más grande */}
      <div className="w-55 h-20 bg-white p-1.5 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-amber-500/20 overflow-hidden">
        <img src={logoSice} alt="SICE S.A. Logo" className="w-full h-full object-contain" />
      </div>
      
      <h1 className="text-2xl font-black text-white tracking-widest mb-1">GI-MO</h1>
      <p className="text-slate-400 text-xs tracking-wider mb-8">Gestión Integral de Obras</p>

      <div className="bg-[#0f1932] border border-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h2 className="text-xl font-semibold text-white mb-1">Iniciar sesión</h2>
        <p className="text-slate-400 text-sm mb-6">
          Ingresa tus credenciales para acceder al sistema.
        </p>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs font-semibold" htmlFor="email">Correo electrónico</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                id="email"
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11 bg-[#162242] border-slate-700 text-white placeholder-slate-600 focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs font-semibold" htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-11 bg-[#162242] border-slate-700 text-white placeholder-slate-600 focus:border-amber-500"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold mt-2 cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Ingresando...</>
            ) : (
              "Ingresar"
            )}
          </Button>
        </form>
      </div>

      <p className="text-center text-slate-500 text-xs mt-6">v1.0.0 © 2026 ObrasManager</p>
    </div>
  );
}