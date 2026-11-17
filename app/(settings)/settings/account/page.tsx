"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, AtSign, Mail, Lock, Download, Trash2 } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { SettingsHeader, SectionLabel, SettingsCard, RowIcon, RowDivider } from "@/components/settings/settings-ui";
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

function daysRemaining(lastChanged: string | null): number | null {
  if (!lastChanged) return null;
  const changedAt = new Date(lastChanged).getTime();
  const daysSince = (Date.now() - changedAt) / (1000 * 60 * 60 * 24);
  if (daysSince >= 30) return null;
  return Math.ceil(30 - daysSince);
}

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
  const [fullNameLockedUntil, setFullNameLockedUntil] = useState<string | null>(null);
  const [usernameLockedUntil, setUsernameLockedUntil] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setEmail(user.email ?? "");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("profiles") as any)
        .select("full_name, username, full_name_updated_at, username_updated_at")
        .eq("id", user.id)
        .maybeSingle();
      setFullName(data?.full_name ?? "");
      setUsername(data?.username ?? "");
      setFullNameLockedUntil(data?.full_name_updated_at ?? null);
      setUsernameLockedUntil(data?.username_updated_at ?? null);
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
      setFullNameLockedUntil(new Date().toISOString());
      setEditing(null);
    } catch (err) {
      flash("error", err instanceof Error ? err.message : "Couldn't update name.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUsername = async () => {
    setSaving(true);
    try {
      await updateUsername(username);
      flash("success", "Username updated.");
      setUsernameLockedUntil(new Date().toISOString());
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
      <div className="app-surface flex flex-col h-full">
        <StatusBar />
        <SettingsHeader title="Account" />

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-6">
          {message && (
            <div
              className="glass-card px-4 py-3.5 rounded-[20px] text-body font-medium"
              style={{
                background: message.type === "success" ? "rgba(52,199,89,0.14)" : "rgba(255,59,48,0.12)",
                color: message.type === "success" ? "var(--color-green)" : "var(--color-red)",
              }}
            >
              {message.text}
            </div>
          )}

          <div>
            <SectionLabel>Profile Details</SectionLabel>
            <SettingsCard>
              <SettingRow icon={User} label="Full Name" value={fullName} editing={editing === "name"} onEditToggle={() => setEditing(editing === "name" ? null : "name")} lockedMessage={daysRemaining(fullNameLockedUntil) ? `Can change again in ${daysRemaining(fullNameLockedUntil)} day(s)` : null}>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="glass-input flex-1 outline-none text-body px-4 py-2.5 rounded-full min-w-0" />
                <SaveButton onClick={handleSaveName} saving={saving} />
              </SettingRow>
              <RowDivider />
              <SettingRow icon={AtSign} label="Username" value={`@${username}`} editing={editing === "username"} onEditToggle={() => setEditing(editing === "username" ? null : "username")} lockedMessage={daysRemaining(usernameLockedUntil) ? `Can change again in ${daysRemaining(usernameLockedUntil)} day(s)` : null}>
                <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} autoCapitalize="none" autoCorrect="off" className="glass-input flex-1 outline-none text-body px-4 py-2.5 rounded-full min-w-0" />
                <SaveButton onClick={handleSaveUsername} saving={saving} />
              </SettingRow>
              <RowDivider />
              <SettingRow icon={Mail} label="Email" value={email} editing={editing === "email"} onEditToggle={() => setEditing(editing === "email" ? null : "email")}>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoCapitalize="none" autoCorrect="off" className="glass-input flex-1 outline-none text-body px-4 py-2.5 rounded-full min-w-0" />
                <SaveButton onClick={handleSaveEmail} saving={saving} />
              </SettingRow>
              <RowDivider />
              <SettingRow icon={Lock} label="Password" value="••••••••" editing={editing === "password"} onEditToggle={() => setEditing(editing === "password" ? null : "password")}>
                <div className="flex-1 space-y-2 min-w-0">
                  <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" placeholder="New password" className="glass-input w-full outline-none text-body px-4 py-2.5 rounded-full" />
                  <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" placeholder="Confirm new password" className="glass-input w-full outline-none text-body px-4 py-2.5 rounded-full" />
                </div>
                <SaveButton onClick={handleSavePassword} saving={saving} />
              </SettingRow>
            </SettingsCard>
            <p className="text-caption mt-2 px-2" style={{ color: "var(--color-gray-1)" }}>
              Your name and username can be changed once every 30 days.
            </p>
          </div>

          <div>
            <SectionLabel>Your Data</SectionLabel>
            <SettingsCard>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="pressable w-full flex items-center gap-3 px-4 py-4 text-left disabled:opacity-60"
              >
                <RowIcon icon={Download} />
                <span className="text-body font-medium flex-1">{exporting ? "Preparing download…" : "Download Account Data"}</span>
              </button>
              <RowDivider />
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="pressable w-full flex items-center gap-3 px-4 py-4 text-left"
              >
                <RowIcon icon={Trash2} tint="rgba(255,59,48,0.12)" color="var(--color-red)" />
                <span className="text-body font-medium flex-1" style={{ color: "var(--color-red)" }}>Delete Account</span>
              </button>
            </SettingsCard>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="glass-strong rounded-[28px] p-6 w-full max-w-sm">
            <h2 className="text-title font-bold mb-2">Delete your account?</h2>
            <p className="text-body mb-4 leading-relaxed" style={{ color: "var(--color-gray-1)" }}>
              This permanently deletes your profile, messages, Sparks, and all data. This cannot be undone.
              Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="glass-input w-full px-4 py-3 rounded-full text-body mb-4 outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                className="glass pressable flex-1 py-3 rounded-full text-body font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmText !== "DELETE" || deleting}
                className="pressable flex-1 py-3 rounded-full text-body font-semibold text-white disabled:opacity-40"
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
  lockedMessage,
}: {
  icon: import("lucide-react").LucideIcon;
  label: string;
  value: string;
  editing: boolean;
  onEditToggle: () => void;
  children: React.ReactNode;
  lockedMessage?: string | null;
}) {
  const locked = !!lockedMessage;
  return (
    <div className="px-4 py-4">
      <button onClick={locked ? undefined : onEditToggle} disabled={locked} className="pressable w-full flex items-center gap-3 disabled:opacity-70 text-left">
        <RowIcon icon={Icon} />
        <div className="flex-1 text-left min-w-0">
          <div className="text-caption" style={{ color: "var(--color-gray-1)" }}>{label}</div>
          <div className="text-body font-medium truncate mt-0.5">{value || "—"}</div>
          {locked && <div className="text-caption mt-0.5" style={{ color: "var(--color-orange)" }}>{lockedMessage}</div>}
        </div>
        {!locked && (
          <span className="glass px-3.5 py-1.5 rounded-full text-caption font-semibold flex-shrink-0" style={{ color: "var(--color-blue)" }}>
            {editing ? "Done" : "Edit"}
          </span>
        )}
      </button>
      {editing && !locked && (
        <div className="pt-3 flex items-start gap-2">
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
      className="pressable px-4 py-2.5 rounded-full text-caption font-semibold text-white disabled:opacity-50 flex-shrink-0"
      style={{ background: "var(--color-blue)" }}
    >
      {saving ? "Saving…" : "Save"}
    </button>
  );
}
