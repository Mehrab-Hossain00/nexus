
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Zap, Check, Lock, Sparkles, Flame, Palette, Shield, CircleDashed, Layers, Eye, X } from 'lucide-react';
import { UserProfile, ShopItem, AppTheme } from '../types.ts';
import { dbService } from '../services/dbService.ts';

interface NexusShopProps {
  user: UserProfile;
  onPurchase: (item: ShopItem) => void;
  onViewGallery?: (galleryId: string) => void;
}

const SHOP_ITEMS: ShopItem[] = [
  // Premium Themes
  { id: 'theme_discord_dark', name: 'Dark', description: 'Classic Dark Mode', price: 1000, type: 'theme', value: 'discord_dark' },
  { id: 'theme_discord_light', name: 'Light', description: 'Bright & Clean', price: 1000, type: 'theme', value: 'discord_light' },
  { id: 'theme_gradient_aurora', name: 'Aurora Borealis', description: 'Cool Teal Gradients', price: 1500, type: 'theme', value: 'gradient_aurora' },
  { id: 'theme_gradient_nebula', name: 'Nebula Dream', description: 'Deep Space Purples', price: 1500, type: 'theme', value: 'gradient_nebula' },
  { id: 'theme_hacker_terminal', name: 'Terminal', description: 'Pure Black & Neon Green', price: 1500, type: 'theme', value: 'hacker_terminal' },
  { id: 'theme_cherry_blossom', name: 'Cherry Blossom', description: 'Soft Pinks & Purples', price: 1500, type: 'theme', value: 'cherry_blossom' },
  { id: 'theme_premium_gold', name: 'Prestige Gold', description: 'A luxurious gold and black theme for the elite.', price: 2500, type: 'theme', value: 'premium_gold' },
  { id: 'theme_premium_cyber', name: 'Cyberpunk 2077', description: 'High-contrast neon yellow and cyan.', price: 2000, type: 'theme', value: 'premium_cyber' },
  { id: 'theme_premium_ethereal', name: 'Ethereal Light', description: 'Soft, glowing angelic whites and light blues.', price: 2000, type: 'theme', value: 'premium_ethereal' },
  { id: 'theme_premium_crimson', name: 'Crimson Blood', description: 'Deep, menacing reds and pure black.', price: 2000, type: 'theme', value: 'premium_crimson' },

  // Galleries
  { id: 'gallery_goth_mommy', name: 'Goth Mommy Gallery', description: 'A very very very special gallery with pictures of goth mommies', price: 1067, type: 'gallery', value: 'goth_mommy' },

  // Badges
  { id: 'badge_scholar', name: 'Scholar Badge', description: 'Show off your dedication with a profile badge.', price: 500, type: 'badge', value: 'scholar' },
  { id: 'badge_elite', name: 'Elite Badge', description: 'A glowing badge for top-tier focusers.', price: 2000, type: 'badge', value: 'elite' },

  // Avatar Borders
  { id: 'border_neon', name: 'Neon Avatar Border', description: 'A glowing cyan border for your profile picture.', price: 600, type: 'avatar_border', value: 'neon' },
  { id: 'border_gold', name: 'Prestige Gold Border', description: 'Flex your wealth with a solid gold avatar ring.', price: 2500, type: 'avatar_border', value: 'gold' },

  // Profile Decos
  { id: 'deco_cyberpunk', name: 'Cyberpunk Profile', description: 'Neon grids and glitch effects for your profile card.', price: 1500, type: 'profile_deco', value: 'cyberpunk' },
  { id: 'deco_ethereal', name: 'Ethereal Profile', description: 'Soft glowing clouds and angelic vibes.', price: 1500, type: 'profile_deco', value: 'ethereal' },
  { id: 'deco_crimson', name: 'Crimson Profile', description: 'Deep reds and dark shadows for a menacing look.', price: 1500, type: 'profile_deco', value: 'crimson' },

  // Utilities
  { id: 'streak_freeze', name: 'Streak Freeze', description: 'Save your streak if you miss a day', price: 1000, type: 'streak_freeze' },
];

export const NexusShop: React.FC<NexusShopProps> = ({ user, onPurchase, onViewGallery }) => {
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [previewItem, setPreviewItem] = useState<ShopItem | null>(null);

  useEffect(() => {
    if (previewItem && previewItem.type === 'theme') {
      document.body.setAttribute('data-theme', previewItem.value);
    } else {
      document.body.setAttribute('data-theme', user.theme || 'default');
    }
    return () => {
      document.body.setAttribute('data-theme', user.theme || 'default');
    };
  }, [previewItem, user.theme]);

  const categories = [
    { id: 'all', label: 'All Items' },
    { id: 'theme', label: 'Themes' },
    { id: 'gallery', label: 'Galleries' },
    { id: 'badge', label: 'Badges' },
    { id: 'avatar_border', label: 'Borders' },
    { id: 'profile_deco', label: 'Decorations' },
    { id: 'streak_freeze', label: 'Utilities' },
  ];

  const handleBuy = async (item: ShopItem) => {
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

  const filteredItems = SHOP_ITEMS.filter(item => activeFilter === 'all' || item.type === activeFilter);

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

      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveFilter(cat.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              activeFilter === cat.id
                ? 'bg-nexus-electric text-white shadow-[0_0_15px_rgba(var(--nexus-accent-rgb),0.4)]'
                : 'bg-nexus-black/40 text-zinc-400 hover:text-white hover:bg-nexus-black/60 border border-nexus-border'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const isUnlocked = 
            (item.type === 'theme' && (user.unlockedThemes || []).includes(item.value as AppTheme)) ||
            (item.type === 'gallery' && (user.unlockedGalleries || []).includes(item.value as string)) ||
            (item.type === 'badge' && (user.unlockedBadges || []).includes(item.value as string)) ||
            (item.type === 'avatar_border' && (user.unlockedAvatarBorders || []).includes(item.value as string)) ||
            (item.type === 'profile_deco' && (user.unlockedProfileDecos || []).includes(item.value as string));
          const canAfford = (user.credits || 0) >= item.price;

          return (
            <motion.div
              key={item.id}
              whileHover={{ y: -5, scale: item.id === 'gallery_goth_mommy' ? 1.02 : 1 }}
              className={`p-6 rounded-[2rem] border backdrop-blur-xl flex flex-col justify-between relative overflow-hidden group transition-all ${
                item.id === 'gallery_goth_mommy'
                  ? isUnlocked
                    ? 'bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-black border-pink-500/50 shadow-[0_0_30px_rgba(236,72,153,0.2)]'
                    : 'bg-gradient-to-br from-pink-900/30 via-purple-900/20 to-black border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.1)]'
                  : isUnlocked 
                    ? 'bg-emerald-500/5 border-emerald-500/20' 
                    : 'bg-nexus-card border-nexus-border'
              }`}
            >
              {item.id === 'gallery_goth_mommy' && (
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay pointer-events-none" />
              )}
              
              {item.id === 'gallery_goth_mommy' ? (
                <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/20 blur-[60px] rounded-full -mr-10 -mt-10 group-hover:bg-pink-500/30 transition-all" />
              ) : (
                <div className="absolute top-0 right-0 w-32 h-32 bg-nexus-electric/5 blur-[40px] rounded-full -mr-10 -mt-10 group-hover:bg-nexus-electric/10 transition-all" />
              )}
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
                    item.id === 'gallery_goth_mommy' 
                      ? 'bg-pink-950/50 border border-pink-500/30 shadow-[inset_0_0_15px_rgba(236,72,153,0.2)]' 
                      : 'bg-nexus-black border border-nexus-border'
                  }`}>
                    {item.type === 'theme' ? <Palette className="w-6 h-6 text-nexus-violet" /> : 
                     item.type === 'gallery' ? <Sparkles className={`w-6 h-6 ${item.id === 'gallery_goth_mommy' ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]' : 'text-pink-500'}`} /> :
                     item.type === 'badge' ? <Shield className="w-6 h-6 text-blue-400" /> :
                     item.type === 'avatar_border' ? <CircleDashed className="w-6 h-6 text-yellow-400" /> :
                     item.type === 'profile_deco' ? <Layers className="w-6 h-6 text-purple-400" /> :
                     <Flame className="w-6 h-6 text-orange-500" />}
                  </div>
                  {isUnlocked && (
                    <div className={`px-3 py-1 border rounded-full flex items-center gap-1.5 ${
                      item.id === 'gallery_goth_mommy'
                        ? 'bg-pink-500/20 border-pink-500/40 shadow-[0_0_10px_rgba(236,72,153,0.2)]'
                        : 'bg-emerald-500/20 border-emerald-500/30'
                    }`}>
                      <Check className={`w-3 h-3 ${item.id === 'gallery_goth_mommy' ? 'text-pink-400' : 'text-emerald-400'}`} />
                      <span className={`text-[9px] font-black uppercase tracking-widest ${item.id === 'gallery_goth_mommy' ? 'text-pink-400' : 'text-emerald-400'}`}>Owned</span>
                    </div>
                  )}
                </div>

                <h3 className={`text-lg font-bold ${item.id === 'gallery_goth_mommy' ? 'text-pink-100 drop-shadow-sm' : 'text-white'}`}>
                  {item.name}
                  {item.id === 'gallery_goth_mommy' && <span className="ml-2 inline-block animate-pulse text-pink-500">✨</span>}
                </h3>
                <p className={`text-xs mt-1 leading-relaxed ${item.id === 'gallery_goth_mommy' ? 'text-pink-200/70' : 'text-zinc-500'}`}>{item.description}</p>
              </div>

              <div className="mt-8 relative z-10 flex gap-2">
                <button
                  disabled={(isUnlocked && item.type !== 'gallery') || (!isUnlocked && !canAfford) || isPurchasing === item.id}
                  onClick={() => {
                    if (isUnlocked && item.type === 'gallery' && item.value) {
                      onViewGallery?.(item.value);
                    } else {
                      handleBuy(item);
                    }
                  }}
                  className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    isUnlocked && item.type === 'gallery' ? 'bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 cursor-pointer shadow-[0_0_15px_rgba(236,72,153,0.2)]' :
                    isUnlocked ? 'bg-emerald-500/10 text-emerald-400 cursor-default' : 
                    canAfford && item.id === 'gallery_goth_mommy' ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:from-pink-500 hover:to-purple-500 active:scale-95 shadow-[0_0_20px_rgba(236,72,153,0.3)]' :
                    canAfford ? 'bg-white text-black hover:bg-zinc-200 active:scale-95' : 
                    'bg-nexus-card text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {isPurchasing === item.id ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : isUnlocked && item.type === 'gallery' ? (
                    <>
                      <Sparkles className="w-4 h-4" />
                      View Gallery
                    </>
                  ) : isUnlocked ? (
                    'Unlocked'
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      {item.price} Credits
                    </>
                  )}
                </button>
                {['theme', 'avatar_border', 'profile_deco'].includes(item.type) && (
                  <button
                    onClick={() => setPreviewItem(item)}
                    className="px-4 py-3 rounded-xl bg-nexus-black/50 border border-nexus-border text-zinc-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {previewItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-nexus-black/80 backdrop-blur-xl animate-fade-in">
          <div className={`w-full max-w-md border rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden animate-slide-up flex flex-col ${
            previewItem.type === 'profile_deco' && previewItem.value === 'cyberpunk' ? 'bg-nexus-black border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.15)] bg-[url("https://www.transparenttextures.com/patterns/cubes.png")]' :
            previewItem.type === 'profile_deco' && previewItem.value === 'ethereal' ? 'bg-gradient-to-br from-indigo-950 to-zinc-950 border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.15)]' :
            previewItem.type === 'profile_deco' && previewItem.value === 'crimson' ? 'bg-gradient-to-br from-red-950 to-black border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.15)]' :
            'bg-nexus-card border-nexus-border'
          }`}>
            <button onClick={() => setPreviewItem(null)} className="absolute top-8 right-8 p-2.5 text-zinc-600 hover:text-white bg-white/[0.03] rounded-xl transition-all z-10">
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center mb-8 relative z-10">
              <h2 className="text-2xl font-bold text-white tracking-tight">Preview: {previewItem.name}</h2>
              <p className="text-zinc-500 text-sm mt-2">{previewItem.description}</p>
            </div>

            <div className="flex flex-col items-center gap-6 mb-8 relative z-10">
              <div className="relative">
                <div className={`w-32 h-32 rounded-[2rem] border p-1 ${
                  previewItem.type === 'avatar_border' && previewItem.value === 'neon' ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] bg-cyan-500/10' :
                  previewItem.type === 'avatar_border' && previewItem.value === 'gold' ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] bg-yellow-500/10' :
                  'border-nexus-border bg-gradient-to-br from-white/10 to-transparent'
                }`}>
                   <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-full h-full rounded-[1.75rem] object-cover shadow-2xl" alt="Preview Avatar" />
                </div>
              </div>
              
              <div className="text-center">
                <h3 className="text-xl font-bold text-white">{user.name || 'Nexus User'}</h3>
                <p className="text-nexus-electric text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
                   Level {user.level || 1} • {user.xp || 0} XP
                </p>
              </div>
            </div>

            {previewItem.type === 'theme' && (
              <div className="p-4 rounded-2xl bg-nexus-black/50 border border-nexus-border mb-8 relative z-10">
                <div className="h-4 w-1/2 bg-nexus-accent rounded mb-3"></div>
                <div className="h-2 w-full bg-zinc-800 rounded mb-2"></div>
                <div className="h-2 w-3/4 bg-zinc-800 rounded"></div>
              </div>
            )}

            <button onClick={() => setPreviewItem(null)} className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest bg-white text-black hover:bg-zinc-200 transition-all relative z-10">
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
