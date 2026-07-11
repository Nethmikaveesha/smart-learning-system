import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function Login() {
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      login(res.data.user, res.data.token);

      if (res.data.user.role === "admin") navigate("/admin");
      else if (res.data.user.role === "teacher") navigate("/teacher");
      else if (res.data.user.role === "student") navigate("/student");
      else if (res.data.user.role === "parent") navigate("/parent");
    } catch (err) {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-slate-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-md w-full max-w-md"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">
          Smart Learning System
        </h1>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <input
          className="w-full border p-3 rounded mb-4"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />

        <input
          className="w-full border p-3 rounded mb-4"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />

        <button className="w-full bg-blue-600 text-white p-3 rounded">
          Login
        </button>

        <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-800 mb-2">Demo Accounts</p>
          <p>admin@test.com</p>
          <p>teacher@test.com</p>
          <p>student@test.com</p>
          <p>parent@test.com</p>
          <p className="mt-2">Password: 123456</p>
        </div>
      </form>
    </div>
  );
}

export default Login;
