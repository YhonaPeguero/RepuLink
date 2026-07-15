import { useState, useRef } from "react";
import { useRepulink } from "../../hooks/useRepulink";
import { type FreelancerProfile } from "../../types/repulink";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Edit2, Check, X, Trash2 } from "lucide-react";

const AVATAR_STORAGE_KEY = "repulink_avatar_";

interface ProfileEditorProps {
  profile: FreelancerProfile;
  walletAddress: string;
  onUpdate: () => void;
}

export function ProfileEditor({ profile, walletAddress, onUpdate }: ProfileEditorProps) {
  const { updateProfile, closeProfile, isSending } = useRepulink();

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(profile.username);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    localStorage.getItem(AVATAR_STORAGE_KEY + walletAddress)
  );

  const [displayUsername, setDisplayUsername] = useState(profile.username);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Avatar upload ────────────────────────────────────────────────────────
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setTxStatus("Image must be under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      localStorage.setItem(AVATAR_STORAGE_KEY + walletAddress, base64);
      setAvatarUrl(base64);
      setTxStatus("Avatar updated!");
      setTimeout(() => setTxStatus(null), 2000);
    };
    reader.readAsDataURL(file);
  };

  // ── Update username ──────────────────────────────────────────────────────
  const handleUpdateUsername = async () => {
    if (!newUsername.trim() || newUsername === displayUsername) return;
    try {
      setTxStatus("Updating username...");
      await updateProfile(newUsername.trim());
      setDisplayUsername(newUsername.trim());
      setTxStatus("Username updated!");
      setIsEditingUsername(false);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      onUpdate();
    } catch (err: any) {
      setTxStatus(`Error: ${err.message}`);
    }
  };

  // ── Close profile ────────────────────────────────────────────────────────
  const handleCloseProfile = async () => {
    try {
      setTxStatus("Closing profile...");
      await closeProfile();
      localStorage.removeItem(AVATAR_STORAGE_KEY + walletAddress);
      setTxStatus("Profile closed.");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      onUpdate();
    } catch (err: any) {
      setTxStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar + username row */}
      <div className="flex items-center gap-5 sm:gap-6">
        {/* Avatar */}
        <div className="relative group perspective-1000">
          <motion.div
            whileHover={{ scale: 1.05, rotateY: 10 }}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-20 w-20 sm:h-24 sm:w-24 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-3xl font-bold text-primary-light shadow-[inset_0_2px_10px_rgba(153,69,255,0.2)] transition-all group-hover:border-primary/50 group-hover:shadow-[0_0_20px_rgba(153,69,255,0.4)]"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              displayUsername.slice(0, 2).toUpperCase()
            )}
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </motion.div>
          <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-card border border-border-low text-primary-light shadow-lg">
            <Camera className="h-4 w-4" />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        {/* Username */}
        <div className="flex-1 space-y-2">
          <AnimatePresence mode="wait">
            {isEditingUsername ? (
              <motion.div 
                key="edit"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  maxLength={32}
                  autoFocus
                  className="flex-1 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm outline-none focus:border-primary/60 focus:bg-primary/10 transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateUsername}
                    disabled={isSending || !newUsername.trim()}
                    className="flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white shadow-[0_0_15px_rgba(153,69,255,0.4)] transition hover:bg-primary-light disabled:opacity-50"
                  >
                    <Check className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Save</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingUsername(false);
                      setNewUsername(profile.username);
                    }}
                    className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 py-2 px-3 text-sm font-medium hover:bg-white/10 transition"
                  >
                    <X className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Cancel</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="view"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-3"
              >
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground neon-text">
                  @{displayUsername}
                </h2>
                <button
                  onClick={() => setIsEditingUsername(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted hover:text-primary hover:border-primary/40 hover:bg-primary/10 transition"
                  title="Edit Username"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary-light">
              {profile.badgeCount} Badge{profile.badgeCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Status */}
      <AnimatePresence>
        {txStatus && (
          <motion.p 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm font-medium text-primary-light bg-primary/10 border border-primary/20 rounded-lg py-2 px-3 inline-block"
          >
            {txStatus}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Delete account */}
      <div className="border-t border-white/5 pt-5">
        <AnimatePresence mode="wait">
          {showDeleteConfirm ? (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-3"
            >
              <p className="text-sm text-red-400 font-medium flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                This will permanently close your profile on-chain and return your rent SOL. Are you absolute sure?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCloseProfile}
                  disabled={isSending}
                  className="rounded-lg bg-red-500/20 border border-red-500/50 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/30 transition disabled:opacity-50"
                >
                  {isSending ? "Closing..." : "Yes, delete profile"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs font-semibold text-muted hover:text-red-400 flex items-center gap-1.5 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Account
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}