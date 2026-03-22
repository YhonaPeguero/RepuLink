import { useState, useRef } from "react";
import { useRepulink } from "../../hooks/useRepulink";
import { type FreelancerProfile } from "../../types/repulink";

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
    <div className="space-y-4">

      {/* Avatar + username row */}
      <div className="flex items-center gap-4">

        {/* Avatar */}
        <div className="relative group">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-cream text-xl font-semibold text-foreground transition group-hover:opacity-80"
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
          </div>
          <div className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background text-xs">
            +
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
        <div className="flex-1 space-y-1">
          {isEditingUsername ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                maxLength={32}
                autoFocus
                className="flex-1 rounded-lg border border-border-low bg-card px-3 py-1.5 text-sm outline-none focus:border-foreground/30"
              />
              <button
                onClick={handleUpdateUsername}
                disabled={isSending || !newUsername.trim()}
                className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditingUsername(false);
                  setNewUsername(profile.username);
                }}
                className="rounded-lg border border-border-low bg-card px-3 py-1.5 text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-base font-medium text-foreground">
                @{displayUsername}
              </p>
              <button
                onClick={() => setIsEditingUsername(true)}
                className="text-xs text-muted underline underline-offset-2 hover:text-foreground transition"
              >
                Edit
              </button>
            </div>
          )}
          <p className="text-xs text-muted">
            {profile.badgeCount} badge{profile.badgeCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Status */}
      {txStatus && (
        <p className="text-xs text-muted">{txStatus}</p>
      )}

      {/* Delete account */}
      <div className="border-t border-border-low pt-4">
        {showDeleteConfirm ? (
          <div className="space-y-2">
            <p className="text-xs text-red-600 font-medium">
              This will permanently close your profile on-chain and return your rent SOL. Are you sure?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCloseProfile}
                disabled={isSending}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isSending ? "Closing..." : "Yes, delete my profile"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-border-low bg-card px-3 py-1.5 text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-red-500 underline underline-offset-2 hover:text-red-700 transition"
          >
            Delete account
          </button>
        )}
      </div>
    </div>
  );
}