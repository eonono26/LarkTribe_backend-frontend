"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, isLoggedIn, type AuthUser } from "@/lib/auth";
import AccountNav from "@/components/AccountNav";
import Image from "next/image";

export default function AccountProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [form, setForm] = useState({ 
    first_name: "", 
    last_name: "", 
    email: "", 
    phone: "",
    preferred_currency: "KES",
    preferred_language: "en",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    auth
      .me()
      .then((u) => {
        setUser(u);
        setForm({ 
          first_name: u.first_name || "", 
          last_name: u.last_name || "", 
          email: u.email || "", 
          phone: u.phone || "",
          preferred_currency: u.preferred_currency || "KES",
          preferred_language: u.preferred_language || "en",
        });
        if (u.profile_picture_url) {
          setProfilePicturePreview(u.profile_picture_url);
        }
      })
      .catch(() => setError("Couldn't load your profile."))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    
    try {
      let updated;
      
      // If there's a new profile picture, use FormData
      if (profilePicture) {
        const formData = new FormData();
        formData.append('profile_picture', profilePicture);
        formData.append('first_name', form.first_name);
        formData.append('last_name', form.last_name);
        formData.append('email', form.email);
        formData.append('phone', form.phone);
        formData.append('preferred_currency', form.preferred_currency);
        formData.append('preferred_language', form.preferred_language);
        
        updated = await auth.updateMe(formData);
      } else {
        // Otherwise use JSON
        updated = await auth.updateMe(form);
      }
      
      setUser(updated);
      if (updated.profile_picture_url) {
        setProfilePicturePreview(updated.profile_picture_url);
      }
      setProfilePicture(null);
      setSaved(true);
    } catch (err) {
      setError("Couldn't save your changes. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    auth.logout();
    router.push("/");
  }

  function handleProfilePictureChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleRemoveProfilePicture() {
    setProfilePicture(null);
    setProfilePicturePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleDeleteProfilePicture() {
    if (!confirm("Are you sure you want to remove your profile picture?")) return;
    
    try {
      const updated = await auth.deleteProfilePicture();
      setUser(updated);
      setProfilePicturePreview(null);
      setProfilePicture(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSaved(true);
    } catch (err) {
      setError("Couldn't remove profile picture. Please try again.");
      console.error(err);
    }
  }

  return (
    <main className="container-shell py-10 max-w-2xl">
      <h1 className="font-display text-2xl font-black mb-1">My account</h1>
      <p className="text-sm text-neutral-500 mb-6">
        {user ? `@${user.username}` : "\u00A0"}
      </p>
      <AccountNav />

      {loading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
          {/* Profile Picture Section */}
          <div className="flex items-center gap-4 p-4 bg-[var(--color-mist)] rounded-lg">
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-neutral-200 flex-shrink-0">
              {profilePicturePreview ? (
                <Image
                  src={profilePicturePreview}
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-neutral-400">
                  {user?.first_name?.[0] || user?.username?.[0] || "?"}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm bg-white px-4 py-1.5 rounded-full border border-neutral-200 hover:bg-neutral-50"
                >
                  Upload
                </button>
                {profilePicturePreview && (
                  <>
                    <button
                      type="button"
                      onClick={handleRemoveProfilePicture}
                      className="text-sm text-neutral-500 px-4 py-1.5 rounded-full border border-neutral-200 hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteProfilePicture}
                      className="text-sm text-red-600 px-4 py-1.5 rounded-full border border-red-200 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                className="hidden"
              />
              <p className="text-xs text-neutral-400">
                {profilePicture ? "New photo selected" : "JPG, PNG or WEBP, max 5MB"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="First name"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
            />
            <input
              placeholder="Last name"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
            />
          </div>
          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
          />
          <input
            placeholder="Phone number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
          />

          {/* Preferences */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Currency</label>
              <select
                value={form.preferred_currency}
                onChange={(e) => setForm({ ...form, preferred_currency: e.target.value })}
                className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
              >
                <option value="KES">KES - Kenyan Shilling</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Language</label>
              <select
                value={form.preferred_language}
                onChange={(e) => setForm({ ...form, preferred_language: e.target.value })}
                className="w-full bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none"
              >
                <option value="en">English</option>
                <option value="sw">Swahili</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-[var(--color-flag)]">{error}</p>}
          {saved && <p className="text-sm text-green-700">Saved.</p>}

          <div className="flex items-center gap-4 pt-2">
            <button
              disabled={saving}
              className="bg-[var(--color-ink)] text-white font-semibold uppercase text-sm tracking-wide px-6 py-3 rounded-full disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-semibold text-neutral-500 hover:text-[var(--color-flag)]"
            >
              Log out
            </button>
          </div>
        </form>
      )}
    </main>
  );
}