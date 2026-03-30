"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveApiUrl, resolveAppUrl } from "@/common/helpers/api";
import { useAuth } from "@/app/common/context/AuthContext";
import { FIELD_LIMITS } from '@/common/fieldLimits';
import Main from "../layout/main";

export default function LoginPage() {
    const router = useRouter();
    const { user, loading, setUser } = useAuth();
    const [identifier, setIdentifier] = useState("");

    useEffect(() => {
        if (!loading && user) {
            router.push(resolveAppUrl(`/${user.username}`));
        }
    }, [user, loading, router]);

    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const submitHandler = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(resolveApiUrl("/login"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, password }),
            });

            if (response.ok) {
                const data = await response.json();
                setSuccess(`Logged in as ${data.name || data.email}`);
                setUser(data);
                router.push(resolveAppUrl(`/${data.username}`));
            } else {
                const json = await response.json();
                setError(json.message || "Login failed");
            }
        } catch (err) {
            setError("Network error");
        }
    };

    return (
        <Main showUserContext={false}>
            <div className="container mx-auto mt-10 p-6 rounded-md shadow">
                <div className="max-w-md bg-white mx-auto p-6 rounded-md shadow">
                    <h2 className="text-xl font-bold mb-4">Log In</h2>
                    <form onSubmit={submitHandler} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Username or Email</label>
                            <input
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                type="text"
                                required
                                maxLength={FIELD_LIMITS.email}
                                className="w-full rounded border p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Password</label>
                            <input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type="password"
                                required
                                maxLength={FIELD_LIMITS.password}
                                className="w-full rounded border p-2"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded font-semibold"
                        >
                            Log In
                        </button>
                    </form>
                    {error && <p className="text-red-500 mt-3">{error}</p>}
                    {success && <p className="text-green-500 mt-3">{success}</p>}
                </div>
            </div>
        </Main>
    );
}
