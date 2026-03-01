
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trophy, Zap, Star } from 'lucide-react';

interface XPPopup {
  id: string;
  amount: number;
  x: number;
  y: number;
}

interface GamificationOverlayProps {
  levelUp?: { level: number; rewards: { xp: number; credits: number } } | null;
  onCloseLevelUp: () => void;
  xpPopups: XPPopup[];
}

export const GamificationOverlay: React.FC<GamificationOverlayProps> = ({ levelUp, onCloseLevelUp, xpPopups }) => {
  return (
    <>
      {/* XP Popups */}
      <div className="fixed inset-0 pointer-events-none z-[9999]">
        <AnimatePresence>
          {xpPopups.map((popup) => (
            <motion.div
              key={popup.id}
              initial={{ opacity: 0, y: popup.y, x: popup.x, scale: 0.5 }}
              animate={{ opacity: 1, y: popup.y - 100, scale: 1.2 }}
              exit={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute flex items-center gap-2 text-nexus-electric font-black text-2xl drop-shadow-[0_0_10px_rgba(124,58,237,0.8)]"
            >
              <Zap className="w-6 h-6 fill-nexus-electric" />
              +{popup.amount} XP
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Level Up Modal */}
      <AnimatePresence>
        {levelUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="w-full max-w-md bg-zinc-900 border border-nexus-electric/30 rounded-[3rem] p-10 text-center relative overflow-hidden shadow-[0_0_100px_rgba(124,58,237,0.2)]"
            >
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-nexus-electric via-nexus-violet to-nexus-electric animate-glow" />
              
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -top-20 -left-20 w-64 h-64 bg-nexus-electric/10 blur-[80px] rounded-full"
              />

              <div className="relative z-10 space-y-8">
                <div className="flex justify-center">
                  <div className="w-24 h-24 rounded-3xl bg-nexus-electric/20 border border-nexus-electric/40 flex items-center justify-center relative">
                    <Trophy className="w-12 h-12 text-nexus-electric" />
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-nexus-electric/20 rounded-3xl blur-xl"
                    />
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-black text-nexus-electric uppercase tracking-[0.5em]">Protocol Advancement</h2>
                  <h3 className="text-5xl font-black text-white mt-2 tracking-tighter">LEVEL {levelUp.level}</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Bonus XP</p>
                    <p className="text-xl font-black text-white">+{levelUp.rewards.xp}</p>
                  </div>
                  <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Credits</p>
                    <p className="text-xl font-black text-nexus-violet">+{levelUp.rewards.credits}</p>
                  </div>
                </div>

                <p className="text-zinc-400 text-sm leading-relaxed">
                  Your cognitive processing power has reached a new threshold. Access to advanced Nexus modules is now expanding.
                </p>

                <button
                  onClick={onCloseLevelUp}
                  className="w-full py-4 bg-white text-black font-black rounded-2xl active:scale-95 transition-all shadow-xl hover:bg-zinc-100 flex items-center justify-center gap-2"
                >
                  CONTINUE PROTOCOL <Zap className="w-4 h-4 fill-black" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
