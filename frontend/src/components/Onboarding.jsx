import { useState } from "react";
import { api } from "../api";

const ACTIVITY_OPTIONS = [
  { value: "sedentary", label: "Jarang olahraga" },
  { value: "light", label: "Ringan — 1–3x/minggu" },
  { value: "moderate", label: "Sedang — 3–5x/minggu" },
  { value: "active", label: "Berat — 6–7x/minggu" },
  { value: "very_active", label: "Atlet / sangat aktif" },
];

const GOAL_OPTIONS = [
  { value: "cutting", label: "Menurunkan berat badan" },
  { value: "maintenance", label: "Menjaga berat badan" },
  { value: "bulking", label: "Menambah massa otot" },
];

const DIET_OPTIONS = [
  { value: "none", label: "Semua jenis makanan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
];

const emptyForm = {
  name: "",
  email: "",
  gender: "male",
  age: "",
  weightKg: "",
  heightCm: "",
  activityLevel: "moderate",
  goal: "maintenance",
  dietaryPreference: "none",
};

export default function Onboarding({ onDone }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.createUser(form);
      onDone(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page--centered">
      <div className="ledger-card onboarding-card">
        <p className="eyebrow">Buku Gizi — Buku Baru</p>
        <h1 className="display-title">Catat kebutuhan gizimu</h1>
        <p className="lede">
          Isi data diri sekali di sini. Kami hitung kebutuhan kalori & makro harianmu,
          lalu kamu tinggal mencatat apa yang kamu makan tiap hari.
        </p>

        <form onSubmit={handleSubmit} className="form-grid">
          <label className="field">
            <span>Nama</span>
            <input required value={form.name} onChange={update("name")} placeholder="Nama kamu" />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={update("email")}
              placeholder="kamu@email.com"
            />
          </label>

          <label className="field">
            <span>Jenis kelamin</span>
            <select value={form.gender} onChange={update("gender")}>
              <option value="male">Laki-laki</option>
              <option value="female">Perempuan</option>
            </select>
          </label>
          <label className="field">
            <span>Usia (tahun)</span>
            <input
              required
              type="number"
              min="10"
              max="100"
              value={form.age}
              onChange={update("age")}
            />
          </label>

          <label className="field">
            <span>Berat badan (kg)</span>
            <input
              required
              type="number"
              min="20"
              max="300"
              value={form.weightKg}
              onChange={update("weightKg")}
            />
          </label>
          <label className="field">
            <span>Tinggi badan (cm)</span>
            <input
              required
              type="number"
              min="100"
              max="250"
              value={form.heightCm}
              onChange={update("heightCm")}
            />
          </label>

          <label className="field field--wide">
            <span>Tingkat aktivitas</span>
            <select value={form.activityLevel} onChange={update("activityLevel")}>
              {ACTIVITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field field--wide">
            <span>Tujuan</span>
            <select value={form.goal} onChange={update("goal")}>
              {GOAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field field--wide">
            <span>Preferensi makanan</span>
            <select value={form.dietaryPreference} onChange={update("dietaryPreference")}>
              {DIET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn btn--primary field--wide" disabled={loading}>
            {loading ? "Menghitung…" : "Hitung kebutuhan gizi"}
          </button>
        </form>
      </div>
    </div>
  );
}
