"use client";

import { useState } from "react";
import { recordPayment } from "@/app/actions/payments";
import { dollars } from "@/lib/format";

type Player = {
  id: string;
  name: string;
  color: string;
  squares: number;
  owed: number;
  won: number;
  paidOut: number;
  balance: number;
};

export function PaymentsTable({ poolId, players }: { poolId: string; players: Player[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-ink/50">
          <tr className="border-b border-line">
            <th className="py-2 text-left">Player</th>
            <th className="py-2 text-left">Squares</th>
            <th className="py-2 text-left">Owed (Entry)</th>
            <th className="py-2 text-left">Won (Running)</th>
            <th className="py-2 text-left">Paid Out</th>
            <th className="py-2 text-left">Balance</th>
            <th className="py-2 text-left">Record Payment</th>
          </tr>
        </thead>
        <tbody>
          {players.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-6 text-center text-ink/60">No players yet.</td>
            </tr>
          ) : (
            players.map((p) => <PlayerRow key={p.id} poolId={poolId} player={p} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

function PlayerRow({ poolId, player }: { poolId: string; player: Player }) {
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(value: number) {
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a positive amount.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await recordPayment(poolId, player.id, value);
      setAmount("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  const balanceColor =
    player.balance > 0 ? "text-red-600" : player.balance < 0 ? "text-forest" : "text-ink";

  return (
    <tr className="border-b border-line last:border-0">
      <td className="py-3">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: player.color }} />
          <span className="font-semibold text-ink">{player.name}</span>
        </span>
      </td>
      <td className="py-3 text-ink">{player.squares}</td>
      <td className="py-3 text-ink">{dollars(player.owed)}</td>
      <td className="py-3 text-ink">{dollars(player.won)}</td>
      <td className="py-3 text-ink">{dollars(player.paidOut)}</td>
      <td className={`py-3 font-bold ${balanceColor}`}>{dollars(player.balance)}</td>
      <td className="py-3">
        <div className="flex items-center gap-2">
          <span className="text-ink/50">$</span>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input w-24"
            placeholder="0"
          />
          <button
            type="button"
            disabled={pending || !amount}
            onClick={() => pay(Number(amount))}
            className="btn-secondary"
          >
            Save
          </button>
          <button
            type="button"
            disabled={pending || player.balance <= 0}
            onClick={() => pay(player.balance)}
            className="btn-gold whitespace-nowrap"
          >
            Pay full balance
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
    </tr>
  );
}
