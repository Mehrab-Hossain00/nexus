import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface GothMommyGalleryProps {
  onClose: () => void;
}

export const GothMommyGallery: React.FC<GothMommyGalleryProps> = ({ onClose }) => {
  // The user said they will provide pictures, so we'll use placeholders for now
  // that fit the goth aesthetic.
  const images = [
    'https://images.unsplash.com/photo-1611601679655-7c8bc197f0c6?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1601288496920-b6154fe3626a?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1542358963-3947b0e123af?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1531627443831-f2e1e3b61073?q=80&w=800&auto=format&fit=crop',
  ];

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-nexus-black/90 backdrop-blur-md" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-6xl max-h-full bg-nexus-card border border-nexus-border rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-nexus-border bg-nexus-black/50">
          <div>
            <h2 className="text-2xl font-bold text-white">Goth Mommy Collection</h2>
            <p className="text-sm text-zinc-400">Your exclusive unlocked gallery</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((src, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedIndex(idx)}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group border border-nexus-border"
              >
                <img 
                  src={src} 
                  alt={`Gallery image ${idx + 1}`} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-nexus-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-nexus-black/95 backdrop-blur-xl"
          >
            <button 
              onClick={() => setSelectedIndex(null)}
              className="absolute top-8 right-8 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-50"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedIndex(prev => prev === null ? null : prev === 0 ? images.length - 1 : prev - 1); }}
              className="absolute left-4 sm:left-8 p-4 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-50"
            >
              <ChevronLeft className="w-8 h-8 text-white" />
            </button>

            <motion.img 
              key={selectedIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              src={images[selectedIndex]} 
              alt="Selected"
              className="max-w-full max-h-screen object-contain p-4 sm:p-12"
            />

            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedIndex(prev => prev === null ? null : prev === images.length - 1 ? 0 : prev + 1); }}
              className="absolute right-4 sm:right-8 p-4 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-50"
            >
              <ChevronRight className="w-8 h-8 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
