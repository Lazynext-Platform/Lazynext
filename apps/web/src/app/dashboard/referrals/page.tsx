"use client";

import { useEffect, useState } from "react";

export default function ReferralsPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetch("/api/promotions/wallet")
      .then(r => r.json())
      .then(d => {
        if (d.success) setBalance(d.balance / 100);
      });

    fetch("/api/referrals/me")
      .then(r => r.json())
      .then(d => {
        if (d.success) setStats(d);
      });
  }, []);

  const handleApply = async () => {
    if (!code) return;
    setApplying(true);
    try {
      const res = await fetch("/api/promotions/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (data.success) {
        alert("Coupon applied successfully!");
        window.location.reload();
      } else {
        alert(data.error || "Failed to apply coupon");
      }
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-8 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Refer & Earn</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Wallet Balance Card */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Wallet Balance</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">
              ${balance !== null ? balance.toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Available to apply to your next billing cycle.
            </p>
          </div>
        </div>

        {/* Stats Card */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Referral Stats</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{stats?.converted || 0} Converted</div>
            <p className="text-xs text-muted-foreground">
              Out of {stats?.total_referrals || 0} total link clicks.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="font-semibold leading-none tracking-tight">Your Referral Link</h3>
          <p className="text-sm text-muted-foreground">
            Share this link with your network. When they sign up and subscribe, you both get platform credits.
          </p>
        </div>
        <div className="p-6 pt-0 flex gap-4">
          <input 
            type="text" 
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground"
            value={stats?.referral_link || "Loading..."}
            readOnly
          />
          <button 
            onClick={() => {
              if (stats?.referral_link) {
                navigator.clipboard.writeText(stats.referral_link);
                alert("Copied!");
              }
            }}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground h-9 px-4 py-2 border border-slate-700"
          >
            Copy Link
          </button>
        </div>
      </div>
      
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="font-semibold leading-none tracking-tight">Apply Promo Code</h3>
          <p className="text-sm text-muted-foreground">
            Got a discount code? Enter it below.
          </p>
        </div>
        <div className="p-6 pt-0 flex gap-4">
          <input 
            type="text" 
            placeholder="SAVE20"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex h-9 w-full max-w-sm rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground border-slate-700"
          />
          <button 
            disabled={applying || !code}
            onClick={handleApply}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 border-slate-700"
          >
            {applying ? "Applying..." : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
