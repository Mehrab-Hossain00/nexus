
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Zap, Check, Lock, Sparkles, Flame, Palette } from 'lucide-react';
import { UserProfile, ShopItem, AppTheme } from '../types.ts';
import { dbService } from '../services/dbService.ts';

interface NexusShopProps {
  user: UserProfile;
  onPurchase: (item: ShopItem) => void;
}

const SHOP_ITEMS: ShopItem[] = [
  { id: 'theme_cyberpunk', name: 'Neon Protocol', description: 'Unlock the Cyberpunk theme', price: 500, type: 'theme', value: 'cyberpunk' },
  { id: 'theme_oceanic', name: 'Oceanic', description: 'Unlock the Oceanic theme', price: 500, type: 'theme', value: 'oceanic' },
  { id: 'theme_sunset', name: 'Sunset', description: 'Unlock the Sunset theme', price: 500, type: 'theme', value: 'sunset' },
  { id: 'theme_forest', name: 'Forest', description: 'Unlock the Forest theme', price: 500, type: 'theme', value: 'forest' },
  { id: 'theme_crimson', name: 'Crimson', description: 'Unlock the Crimson theme', price: 500, type: 'theme', value: 'crimson' },
  { id: 'streak_freeze', name: 'Streak Freeze', description: 'Save your streak if you miss a day', price: 1000, type: 'streak_freeze' },
];

export const NexusShop: React.FC<NexusShopProps> = ({ user, onPurchase }) => {
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  const handleBuy = async (item: ShopItem) => {
    if ((user.credits || 0) < item.price) return;
    setIsPurchasing(item.id);
    try {
      await dbService.purchaseItem(user.uid, item);
      onPurchase(item);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPurchasing(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar space-y-8 animate-fade-in pb-20 pr-2">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Nexus Emporium</h1>
          <p className="text-zinc-500 text-sm mt-1">Exchange your hard-earned credits for protocol upgrades.</p>
        </div>
        <div className="bg-nexus-electric/10 border border-nexus-electric/20 px-6 py-3 rounded-2xl flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-nexus-electric fill-nexus-electric" />
          <span className="text-xl font-black text-white">{user.credits || 0}</span>
          <span className="text-[10px] font-bold text-nexus-electric uppercase tracking-widest">Credits</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SHOP_ITEMS.map((item) => {
          const isUnlocked = item.type === 'theme' && (user.unlockedThemes || []).includes(item.value as AppTheme);
          const canAfford = (user.credits || 0) >= item.price;

          return (
            <motion.div
              key={item.id}
              whileHover={{ y: -5 }}
              className={`p-6 rounded-[2rem] border backdrop-blur-xl flex flex-col justify-between relative overflow-hidden group transition-all ${isUnlocked ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-900/20 border-white/5'}`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-nexus-electric/5 blur-[40px] rounded-full -mr-10 -mt-10 group-hover:bg-nexus-electric/10 transition-all" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-black border border-white/5 flex items-center justify-center shadow-inner">
                    {item.type === 'theme' ? <Palette className="w-6 h-6 text-nexus-violet" /> : <Flame className="w-6 h-6 text-orange-500" />}
                  </div>
                  {isUnlocked && (
                    <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Owned</span>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white">{item.name}</h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{item.description}</p>
              </div>

              <div className="mt-8 relative z-10">
                <button
                  disabled={isUnlocked || !canAfford || isPurchasing === item.id}
                  onClick={() => handleBuy(item)}
                  className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isUnlocked ? 'bg-emerald-500/10 text-emerald-400 cursor-default' : canAfford ? 'bg-white text-black hover:bg-zinc-200 active:scale-95' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
                >
                  {isPurchasing === item.id ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : isUnlocked ? (
                    'Unlocked'
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      {item.price} Credits
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
