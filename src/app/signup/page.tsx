"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { resolveApiUrl, resolveAppUrl } from "@/common/helpers/api";
import { useAuth } from "@/app/common/context/AuthContext";
import { FIELD_LIMITS } from "@/common/limits";
import CharCount from "@/app/common/components/charCount";
import Main from "../layout/main";

type PreflightStatus = "idle" | "checking" | "available" | "taken";

function StatusOrb({ status, takenMessage, availableMessage }: { status: PreflightStatus; takenMessage: string; availableMessage: string }) {
    if (status === "idle" || status === "checking") return null;
    const isTaken = status === "taken";
    return (
        <p className={`flex items-center gap-1.5 text-sm mt-1 ${isTaken ? "text-red-600" : "text-green-600"}`}>
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${isTaken ? "bg-red-500" : "bg-green-500"}`} />
            {isTaken ? takenMessage : availableMessage}
        </p>
    );
}

export default function SignupPage() {
    const router = useRouter();
    const { user, loading, setUser } = useAuth();

    useEffect(() => {
        if (!loading && user) {
            router.push(resolveAppUrl(`/${user.username}`));
        }
    }, [user, loading, router]);

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const [usernameStatus, setUsernameStatus] = useState<PreflightStatus>("idle");
    const [emailStatus, setEmailStatus] = useState<PreflightStatus>("idle");
    const [passwordMismatch, setPasswordMismatch] = useState(false);

    const checkAvailability = useCallback(async (field: "username" | "email", value: string) => {
        if (!value.trim()) return;
        const setter = field === "username" ? setUsernameStatus : setEmailStatus;
        setter("checking");
        try {
            const res = await fetch(resolveApiUrl("/signup/preflight"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ field, value }),
            });
            if (res.ok) {
                const data = await res.json();
                setter(data.available ? "available" : "taken");
            } else {
                setter("idle");
            }
        } catch {
            setter("idle");
        }
    }, []);

    const handleConfirmPasswordBlur = () => {
        if (confirmPassword && password !== confirmPassword) {
            setPasswordMismatch(true);
        } else {
            setPasswordMismatch(false);
        }
    };

    const handlePasswordChange = (val: string) => {
        setPassword(val);
        if (confirmPassword) {
            setPasswordMismatch(val !== confirmPassword);
        }
    };

    const handleConfirmPasswordChange = (val: string) => {
        setConfirmPassword(val);
        if (val && password) {
            setPasswordMismatch(password !== val);
        } else {
            setPasswordMismatch(false);
        }
    };

    const allPreflightsPassed =
        usernameStatus === "available" &&
        emailStatus === "available" &&
        password.length > 0 &&
        confirmPassword.length > 0 &&
        !passwordMismatch;

    const submitHandler = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        try {
            const response = await fetch(resolveApiUrl('/signup'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, name }),
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data);
                router.push(resolveAppUrl(`/${data.username}`));
            } else {
                const body = await response.json();
                setError(body.message || 'Could not sign up');
            }
        } catch (err) {
            setError('Network error');
        }
    };

    return (
        <Main showUserContext={false}>
            <div className="container mx-auto mt-10 p-6 rounded-md shadow">
                <div className="max-w-md bg-white mx-auto p-6 rounded-md shadow">
                    <h2 className="text-xl font-bold mb-4">Sign Up</h2>
                    <form onSubmit={submitHandler} className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium">Username</label>
                                <CharCount current={username.length} max={FIELD_LIMITS.username} />
                            </div>
                            <input
                                value={username}
                                onChange={(e) => { setUsername(e.target.value.replace(/\s/g, '')); setUsernameStatus("idle"); }}
                                onBlur={() => checkAvailability("username", username)}
                                type="text"
                                required
                                maxLength={FIELD_LIMITS.username}
                                className="w-full rounded border p-2"
                            />
                            <StatusOrb status={usernameStatus} takenMessage="Username is already taken" availableMessage="Username is available" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium">Name</label>
                                <CharCount current={name.length} max={FIELD_LIMITS.name} />
                            </div>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                type="text"
                                required
                                maxLength={FIELD_LIMITS.name}
                                className="w-full rounded border p-2"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium">Email</label>
                                <CharCount current={email.length} max={FIELD_LIMITS.email} />
                            </div>
                            <input
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setEmailStatus("idle"); }}
                                onBlur={() => checkAvailability("email", email)}
                                type="email"
                                required
                                maxLength={FIELD_LIMITS.email}
                                className="w-full rounded border p-2"
                            />
                            <StatusOrb status={emailStatus} takenMessage="Email is already in use" availableMessage="Email is available" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium">Password</label>
                                <CharCount current={password.length} max={FIELD_LIMITS.password} />
                            </div>
                            <input
                                value={password}
                                onChange={(e) => handlePasswordChange(e.target.value)}
                                type="password"
                                required
                                maxLength={FIELD_LIMITS.password}
                                className="w-full rounded border p-2"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium">Confirm Password</label>
                                <CharCount current={confirmPassword.length} max={FIELD_LIMITS.password} />
                            </div>
                            <input
                                value={confirmPassword}
                                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                                onBlur={handleConfirmPasswordBlur}
                                type="password"
                                required
                                maxLength={FIELD_LIMITS.password}
                                className="w-full rounded border p-2"
                            />
                            {passwordMismatch && (
                                <p className="text-red-500 text-sm mt-1">Passwords do not match</p>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={!allPreflightsPassed}
                            className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Sign Up
                        </button>
                    </form>
                    {error && <p className="text-red-500 mt-3">{error}</p>}
                </div>
            </div>
        </Main>
    );
}
