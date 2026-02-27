import { motion } from 'framer-motion';
import { Languages } from 'lucide-react';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/clerk-react";

export default function ClerkLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-red-500 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-4 shadow-lg"
          >
            <Languages className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-pink-100 bg-clip-text text-transparent">
            IndianTranslator
          </h1>
          <p className="text-white/80 text-lg">
            Translate across Indian languages
          </p>
        </div>

        {/* Clerk Auth Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20"
        >
          <SignedOut>
            <div className="space-y-4">
              <SignInButton mode="modal">
                <button className="w-full bg-white text-purple-600 hover:bg-white/90 h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all rounded-lg">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="w-full bg-white/20 text-white hover:bg-white/30 h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all rounded-lg border border-white/30">
                  Sign Up
                </button>
              </SignUpButton>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <UserButton afterSignOutUrl="/" />
              </div>
              <p className="text-white text-lg">Welcome back!</p>
              <p className="text-white/70 text-sm mt-2">You are signed in</p>
            </div>
          </SignedIn>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-white/80 text-sm"
        >
          <p>✨ Free text & voice translation</p>
          <p>📄 PDF translation with layout preservation</p>
          <p>🌐 4 Indian languages supported</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
