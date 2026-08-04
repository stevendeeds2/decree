/** Dirty fixture — looks fine in a browser; Decree must fail CI. */
export function App() {
  return (
    <main className="p-[17px] bg-[#1a1a2e] text-white">
      <div className="rounded-xl border p-4 shadow">
        <h1 className="text-xl font-bold">Decree dirty</h1>
        <p className="mt-2 text-sm opacity-80">AI-shaped lookalike UI.</p>
        <button
          type="button"
          className="mt-4 rounded bg-[#3b82f6] px-4 py-2"
          onClick={() => undefined}
        >
          Continue
        </button>
        <input className="mt-2 w-full border p-[13px]" placeholder="Email" />
      </div>
    </main>
  );
}
