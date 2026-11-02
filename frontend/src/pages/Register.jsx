import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = ["client", "freelancer"];

function Register() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const submittingRef = useRef(false);

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        role: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (event) => {
        setFormData((current) => ({
            ...current,
            [event.target.name]: event.target.value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (submittingRef.current) {
            return;
        }

        const fullName = formData.fullName.trim();
        const email = formData.email.trim();
        const { password, role } = formData;

        if (fullName.length < 2 || fullName.length > 120) {
            setError("Full name must be between 2 and 120 characters.");
            return;
        }

        if (!EMAIL_PATTERN.test(email)) {
            setError("Please enter a valid email address.");
            return;
        }

        if (password.length < 8 || password.length > 128) {
            setError("Password must be between 8 and 128 characters.");
            return;
        }

        if (!ALLOWED_ROLES.includes(role)) {
            setError("Please select a valid account type.");
            return;
        }

        submittingRef.current = true;
        setError("");
        setLoading(true);

        try {
            await register({
                fullName,
                email,
                password,
                role,
            });
            navigate("/");
        } catch (requestError) {
            const status = requestError.response?.status;
            const backendMessage =
                requestError.response?.data?.message;

            setError(
                status >= 500 || !status
                    ? "Unable to create your account right now. Please try again."
                    : backendMessage ||
                          "Registration failed. Please review your details and try again."
            );
        } finally {
            submittingRef.current = false;
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
                <h1 className="text-center text-3xl font-bold text-gray-900">
                    TalentBridge
                </h1>

                <p className="mt-2 text-center text-gray-500">
                    Create your account
                </p>

                {error && (
                    <div
                        role="alert"
                        className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-600"
                    >
                        {error}
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="mt-6 space-y-5"
                >
                    <div>
                        <label
                            htmlFor="fullName"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Full Name
                        </label>
                        <input
                            id="fullName"
                            name="fullName"
                            type="text"
                            value={formData.fullName}
                            onChange={handleChange}
                            minLength={2}
                            maxLength={120}
                            required
                            autoComplete="name"
                            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                            placeholder="Your full name"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            autoComplete="email"
                            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            minLength={8}
                            maxLength={128}
                            required
                            autoComplete="new-password"
                            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                            placeholder="At least 8 characters"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="role"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Role
                        </label>
                        <select
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            required
                            className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                        >
                            <option value="" disabled>
                                Select your role
                            </option>
                            <option value="client">Client</option>
                            <option value="freelancer">
                                Freelancer
                            </option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading
                            ? "Creating account..."
                            : "Create Account"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    Already have an account?{" "}
                    <Link
                        to="/login"
                        className="font-semibold text-blue-600 hover:text-blue-700"
                    >
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default Register;
