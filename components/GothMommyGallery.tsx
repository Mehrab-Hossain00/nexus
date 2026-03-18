import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react';
import { UserProfile, GalleryImage } from '../types.ts';
import { db } from '../services/firebase.ts';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';

interface GothMommyGalleryProps {
  user: UserProfile | null;
  onClose: () => void;
}

export const GothMommyGallery: React.FC<GothMommyGalleryProps> = ({ user, onClose }) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editModalData, setEditModalData] = useState<{ id: string, url: string } | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const isTestUser = user?.name === 'test';

  useEffect(() => {
    const q = query(collection(db, 'goth_mommy_gallery'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setImages(snap.docs.map(d => ({ id: d.id, ...d.data() } as GalleryImage)));
    });
    return () => unsubscribe();
  }, []);

  const handleAddImage = () => {
    setImageUrlInput('');
    setIsAddModalOpen(true);
  };

  const confirmAddImage = async () => {
    if (imageUrlInput.trim()) {
      await addDoc(collection(db, 'goth_mommy_gallery'), {
        url: imageUrlInput.trim(),
        createdAt: Date.now()
      });
      setIsAddModalOpen(false);
    }
  };

  const handleEditImage = (e: React.MouseEvent, id: string, currentUrl: string) => {
    e.stopPropagation();
    setImageUrlInput(currentUrl);
    setEditModalData({ id, url: currentUrl });
  };

  const confirmEditImage = async () => {
    if (editModalData && imageUrlInput.trim() && imageUrlInput.trim() !== editModalData.url) {
      await updateDoc(doc(db, 'goth_mommy_gallery', editModalData.id), { url: imageUrlInput.trim() });
    }
    setEditModalData(null);
  };

  const handleDeleteImage = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteModalId(id);
  };

  const confirmDeleteImage = async () => {
    if (deleteModalId) {
      await deleteDoc(doc(db, 'goth_mommy_gallery', deleteModalId));
      setDeleteModalId(null);
    }
  };

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
          <div className="flex items-center gap-4">
            {isTestUser && (
              <button 
                onClick={handleAddImage}
                className="flex items-center gap-2 px-4 py-2 bg-nexus-electric text-white rounded-xl hover:bg-nexus-electric/80 transition-colors font-bold text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Image
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <p>No images in the gallery yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {images.map((img, idx) => (
                <motion.div
                  key={img.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedIndex(idx)}
                  className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group border border-nexus-border"
                >
                  <img 
                    src={img.url} 
                    alt={`Gallery image ${idx + 1}`} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-nexus-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {isTestUser && (
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button 
                        onClick={(e) => handleEditImage(e, img.id, img.url)}
                        className="p-2 bg-nexus-black/80 backdrop-blur-sm border border-nexus-border rounded-lg text-white hover:text-nexus-electric transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteImage(e, img.id)}
                        className="p-2 bg-nexus-black/80 backdrop-blur-sm border border-nexus-border rounded-lg text-white hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedIndex !== null && images[selectedIndex] && (
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
              src={images[selectedIndex].url} 
              alt="Selected"
              className="max-w-full max-h-screen object-contain p-4 sm:p-12"
              referrerPolicy="no-referrer"
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

      <AnimatePresence>
        {(isAddModalOpen || editModalData) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-nexus-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-nexus-card border border-nexus-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4">
                {isAddModalOpen ? 'Add New Image' : 'Edit Image URL'}
              </h3>
              <input 
                type="text" 
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full bg-nexus-black border border-nexus-border rounded-xl p-3 text-white focus:border-nexus-electric focus:outline-none mb-6"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditModalData(null);
                  }}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={isAddModalOpen ? confirmAddImage : confirmEditImage}
                  className="px-4 py-2 rounded-xl bg-nexus-electric text-white font-medium hover:bg-nexus-electric/80 transition-colors"
                >
                  {isAddModalOpen ? 'Add Image' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {deleteModalId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-nexus-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-nexus-card border border-rose-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-2">Delete Image</h3>
              <p className="text-zinc-400 mb-6">Are you sure you want to delete this image? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setDeleteModalId(null)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteImage}
                  className="px-4 py-2 rounded-xl bg-rose-500 text-white font-medium hover:bg-rose-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
