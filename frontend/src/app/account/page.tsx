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
    <main className="bg-stone-50 text-espresso pt-20 font-sans min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      <span className="text-[11px] uppercase tracking-widest text-stone-500 block mb-1">Lark Tribe</span>
      <h1 className="font-editorial text-3xl sm:text-4xl text-espresso mb-1">
        {user ? `${user.first_name || user.username}` : "My Account"}
      </h1>
      <p className="text-sm text-stone-500 mb-6">
        {user ? `@${user.username}` : "\u00A0"}
      </p>
      <AccountNav />

      {loading ? (
        <p className="text-stone-400">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 max-w-none bg-white border border-stone-200 rounded-2xl p-5 sm:p-8 shadow-sm">
          {/* Profile Picture Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-stone-50 border border-stone-200 rounded-xl">
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-stone-200 flex-shrink-0">
              {profilePicturePreview ? (
                <Image
                  src={profilePicturePreview}
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-editorial text-2xl text-stone-400">
                  {user?.first_name?.[0] || user?.username?.[0] || "?"}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs uppercase tracking-wider bg-white px-4 py-1.5 rounded-full border border-stone-300 hover:border-espresso transition"
                >
                  Upload
                </button>
                {profilePicturePreview && (
                  <>
                    <button
                      type="button"
                      onClick={handleRemoveProfilePicture}
                      className="text-xs uppercase tracking-wider text-stone-500 px-4 py-1.5 rounded-full border border-stone-300 hover:border-espresso transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteProfilePicture}
                      className="text-xs uppercase tracking-wider text-terracotta px-4 py-1.5 rounded-full border border-terracotta/40 hover:bg-terracotta/5 transition"
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
              <p className="text-xs text-stone-400">
                {profilePicture ? "New photo selected" : "JPG, PNG or WEBP, max 5MB"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="First name"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="w-full min-w-0 bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 outline-none focus:bg-white focus:ring-1 focus:ring-espresso text-sm transition"
            />
            <input
              placeholder="Last name"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="w-full bg-stone-100 rounded-none px-4 py-3 outline-none focus:bg-stone-50 focus:ring-1 focus:ring-espresso text-sm"
            />
          </div>
          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full bg-stone-100 rounded-none px-4 py-3 outline-none focus:bg-stone-50 focus:ring-1 focus:ring-espresso text-sm"
          />
          <input
            placeholder="Phone number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full bg-stone-100 rounded-none px-4 py-3 outline-none focus:bg-stone-50 focus:ring-1 focus:ring-espresso text-sm"
          />

          {/* Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-[11px] uppercase tracking-widest text-stone-500 block mb-1">Currency</label>
              <select
                value={form.preferred_currency}
                onChange={(e) => setForm({ ...form, preferred_currency: e.target.value })}
                className="w-full min-w-0 bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 outline-none focus:ring-1 focus:ring-espresso text-sm"
              >
                <option value="KES">KES - Kenyan Shilling</option>
                {/* <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option> */}
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-stone-500 block mb-1">Language</label>
              <select
                value={form.preferred_language}
                onChange={(e) => setForm({ ...form, preferred_language: e.target.value })}
                className="w-full bg-stone-100 rounded-none px-4 py-3 outline-none text-sm"
              >
                <option value="en">English</option>
                <option value="sw">Swahili</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-terracotta">{error}</p>}
          {saved && <p className="text-sm text-emerald-700">Saved.</p>}

          <div className="flex items-center gap-6 pt-3">
            <button
              disabled={saving}
              className="px-8 py-3.5 rounded-full bg-espresso text-stone-50 hover:bg-stone-900 disabled:opacity-40 text-xs uppercase tracking-widest font-semibold transition"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs uppercase tracking-widest text-stone-500 hover:text-terracotta transition"
            >
              Log Out
            </button>
          </div>
        </form>
      )}
      </div>
    </main>
  );
}