"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, AtSign, Mail, Lock, Download, Trash2 } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import {
  updateFullName,
  updateUsername,
  requestEmailChange,
  updatePassword,
  deleteOwnAccount,
  exportAccountData,
} from "@/services/account-service";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase";

const supabase = createClient();

type FieldKey = "name" | "username" | "email" | "password" | null;

export default function AccountSettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [editing, setEditing] = useState<FieldKey>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setEmail(user.email ?? "");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("profiles") as any)
        .select("full_name, username")
        .eq("id", user.id)
        .maybeSingle();
      setFullName(data?.full_name ?? "");
      setUsername(data?.username ?? "");
    })();
  }, [router]);

  const flash = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSaveName = async () => {
    setSaving(true);
    try {
      await updateFullName(fullName);
      flash("success", "Name updated.");
      setEditing(null);
    } catch {
      flash("error", "Couldn't update name.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUsername = async () => {
    setSaving(true);
    try {
      await updateUsername(username);
      flash("success", "Username updated.");
      setEditing(null);
    } catch (err) {
      flash("error", err instanceof Error ? err.message : "Couldn't update username.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    setSaving(true);
    try {
      await requestEmailChange(email);
      flash("success", "Confirmation link sent to your new email — click it to finish the change.");
      setEditing(null);
    } catch {
      flash("error", "Couldn't update email.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 8) {
      flash("error", "Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      flash("error", "Passwords don't match.");
      return;
    }
    setSaving(true);
    try {
      await updatePassword(newPassword);
      flash("success", "Password updated.");
      setNewPassword("");
      setConfirmPassword("");
      setEditing(null);
    } catch {
      flash("error", "Couldn't update password.");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAccountData();
    } catch {
      flash("error", "Couldn't export data.");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setDeleting(true);
    try {
      await deleteOwnAccount();
      await logout();
      router.push("/");
    } catch {
      flash("error", "Couldn't delete account. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <ScreenContainer>
      <div className="flex flex-col h-full" style={{ background: "var(--color-gray-2)" }}>
        <StatusBar />
        <div className="flex items-center px-5 pt-2 pb-3">
          <button onClick={() => router.back()} aria-label="Back">
            <BackIcon />
          </button>
          <h1 className="text-xl font-bold ml-3">Account</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {message && (
            <div
              className="mb-4 px-4 py-3 rounded-2xl text-sm"
              style={{
                background: message.type === "success" ? "rgba(52,199,89,0.12)" : "rgba(255,59,48,0.12)",
                color: message.type === "success" ? "var(--color-green)" : "var(--color-red)",
              }}
            >
              {message.text}
            </div>
          )}

          <SettingRow icon={User} label="Full Name" value={fullName} editing={editing === "name"} onEditToggle={() => setEditing(editing === "name" ? null : "name")}>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="flex-1 outline-none text-sm bg-transparent border-b py-1" style={{ borderColor: "var(--color-gray-3)" }} />
            <SaveButton onClick={handleSaveName} saving={saving} />
          </SettingRow>

          <SettingRow icon={AtSign} label="Username" value={`@${username}`} editing={editing === "username"} onEditToggle={() => setEditing(editing === "username" ? null : "username")}>
            <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} autoCapitalize="none" autoCorrect="off" className="flex-1 outline-none text-sm bg-transparent border-b py-1" style={{ borderColor: "var(--color-gray-3)" }} />
            <SaveButton onClick={handleSaveUsername} saving={saving} />
          </SettingRow>

          <SettingRow icon={Mail} label="Email" value={email} editing={editing === "email"} onEditToggle={() => setEditing(editing === "email" ? null : "email")}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoCapitalize="none" autoCorrect="off" className="flex-1 outline-none text-sm bg-transparent border-b py-1" style={{ borderColor: "var(--color-gray-3)" }} />
            <SaveButton onClick={handleSaveEmail} saving={saving} />
          </SettingRow>

          <SettingRow icon={Lock} label="Password" value="••••••••" editing={editing === "password"} onEditToggle={() => setEditing(editing === "password" ? null : "password")}>
            <div className="flex-1 space-y-2">
              <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" placeholder="New password" className="w-full outline-none text-sm bg-transparent border-b py-1" style={{ borderColor: "var(--color-gray-3)" }} />
              <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" placeholder="Confirm new password" className="w-full outline-none text-sm bg-transparent border-b py-1" style={{ borderColor: "var(--color-gray-3)" }} />
            </div>
            <SaveButton onClick={handleSavePassword} saving={saving} />
          </SettingRow>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white mt-3 disabled:opacity-60"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,122,255,0.12)" }}>
              <Download size={18} color="var(--color-blue)" strokeWidth={1.8} />
            </div>
            <span className="text-sm font-medium flex-1 text-left">{exporting ? "Preparing download…" : "Download Account Data"}</span>
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white mt-3"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,59,48,0.12)" }}>
              <Trash2 size={18} color="var(--color-red)" strokeWidth={1.8} />
            </div>
            <span className="text-sm font-medium flex-1 text-left" style={{ color: "var(--color-red)" }}>Delete Account</span>
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete your account?</h2>
            <p className="text-sm mb-4" style={{ color: "var(--color-gray-1)" }}>
              This permanently deletes your profile, messages, Sparks, and all data. This cannot be undone.
              Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-4 py-2.5 rounded-2xl text-sm mb-4 outline-none border"
              style={{ borderColor: "var(--color-gray-3)" }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                className="flex-1 py-2.5 rounded-2xl text-sm font-semibold"
                style={{ background: "var(--color-gray-2)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmText !== "DELETE" || deleting}
                className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: "var(--color-red)" }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ScreenContainer>
  );
}

function SettingRow({
  icon: Icon,
  label,
  value,
  editing,
  onEditToggle,
  children,
}: {
  icon: import("lucide-react").LucideIcon;
  label: string;
  value: string;
  editing: boolean;
  onEditToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white mt-3 overflow-hidden">
      <button onClick={onEditToggle} className="w-full flex items-center gap-3 px-4 py-3.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,122,255,0.12)" }}>
          <Icon size={18} color="var(--color-blue)" strokeWidth={1.8} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-xs" style={{ color: "var(--color-gray-1)" }}>{label}</div>
          <div className="text-sm font-medium truncate">{value || "—"}</div>
        </div>
        <span className="text-xs font-semibold" style={{ color: "var(--color-blue)" }}>{editing ? "Cancel" : "Edit"}</span>
      </button>
      {editing && (
        <div className="px-4 pb-4 flex items-end gap-3">
          {children}
        </div>
      )}
    </div>
  );
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50 flex-shrink-0"
      style={{ background: "var(--color-blue)" }}
    >
      {saving ? "Saving…" : "Save"}
    </button>
  );
}

function BackIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
