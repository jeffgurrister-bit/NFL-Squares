"use client";

import { useState } from "react";
import { recordPayment, setEntryFeePaid } from "@/app/actions/payments";
import { dollars } from "@/lib/format";

type Player = {
  id: string;
  name: string;
  color: string;
  squares: number;
  owed: number;          // entry fee owed = squares × entryFeePerSquare
  entryFeePaid: number;  // running total received from this player
  won: number;           // computed running winnings
  paidOut: number;       // running total paid TO this player
  balance: number;       // won - paidOut
};

export function PaymentsTable({ poolId, players }: { poolId: string; players: Player[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-ink/50">
          <tr className="border-b border-line">
            <th className="py-2 text-left">Player</th>
            <th className="py-2 text-left">Squares</th>
            <th className="py-2 text-left">Entry Owed</th>
            <th className="py-2 text-left">Entry Paid</th>
            <th className="py-2 text-left">Won (Running)</th>
            <th className="py-2 text-left">Paid Out</th>
            <th className="py-2 text-left">Balance</th>
            <th className="py-2 text-left">Record Payout</th>
          </tr>
        </thead>
        <tbody>
          {players.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-6 text-center text-ink/60">No players yet.</td>
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

  const [entryAmount, setEntryAmount] = useState(String(player.entryFeePaid));
  const [entryPending, setEntryPending] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

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

  async function saveEntry() {
    const value = Number(entryAmount);
    if (!Number.isFinite(value) || value < 0) {
      setEntryError("Must be 0 or positive.");
      return;
    }
    setEntryPending(true);
    setEntryError(null);
    try {
      await setEntryFeePaid(player.id, value);
    } catch (e) {
      setEntryError(e instanceof Error ? e.message : "Failed");
    } finally {
      setEntryPending(false);
    }
  }

  const balanceColor =
    player.balance > 0 ? "text-red-600" : player.balance < 0 ? "text-forest" : "text-ink";

  const entryShortfall = player.owed - player.entryFeePaid;
  const entryColor =
    entryShortfall > 0 ? "text-red-600" : entryShortfall < 0 ? "text-forest" : "text-ink/70";

  return (
    <tr className="border-b border-line last:border-0 align-top">
      <td className="py-3">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: player.color }} />
          <span className="font-semibold text-ink">{player.name}</span>
        </span>
      </td>
      <td className="py-3 text-ink">{player.squares}</td>
      <td className="py-3 text-ink">{dollars(player.owed)}</td>
      <td className="py-3">
        <div className="flex items-center gap-2">
          <span className="text-ink/50">$</span>
          <input
            type="number"
            min={0}
            value={entryAmount}
            onChange={(e) => setEntryAmount(e.target.value)}
            className="input w-20"
          />
          <button
            type="button"
            disabled={entryPending}
            onClick={saveEntry}
            className="btn-secondary"
          >
            Save
          </button>
        </div>
        {entryShortfall !== 0 && (
          <p className={`mt-1 text-[11px] ${entryColor}`}>
            {entryShortfall > 0 ? `${dollars(entryShortfall)} short` : `${dollars(-entryShortfall)} over`}
          </p>
        )}
        {entryError && <p className="mt-1 text-xs text-red-600">{entryError}</p>}
      </td>
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
            className="input w-20"
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
            Pay full
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
    </tr>
  );
}
