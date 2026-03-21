"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveApiUrl, resolveAppUrl } from "@/common/helpers/api";
import { useAuth } from "@/app/common/context/AuthContext";
import Main from "../layout/main";

export default function SignupPage() {
    const router = useRouter();
    const { user, loading, setUser } = useAuth();

    useEffect(() => {
        if (!loading && user) {
            router.push(resolveAppUrl('/profile'));
        }
    }, [user, loading, router]);

    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const submitHandler = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        try {
            const response = await fetch(resolveApiUrl('/signup'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name }),
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data);
                router.push(resolveAppUrl('/profile'));
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
                            <label className="block text-sm font-medium">Name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                type="text"
                                required
                                className="w-full rounded border p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Email</label>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                type="email"
                                required
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
                                className="w-full rounded border p-2"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded font-semibold"
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
