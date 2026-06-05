import React from 'react';

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center py-24">
      <div className="w-full max-w-4xl space-y-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Billing & Subscriptions</h1>
          <p className="text-zinc-400 mt-2 text-lg">Manage your Lazynext PRO subscription and usage.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Current Plan Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Current Plan: Free</h3>
              <p className="text-zinc-400 mt-2 text-sm">
                You are currently on the free tier. Upgrade to PRO to unlock advanced Agentic tools like automatic silence detection, local Ollama execution, and 4K exporting.
              </p>
            </div>
            
            <div className="mt-8">
              {/* This would hit our Stripe checkout session endpoint */}
              <form action="/api/stripe/checkout" method="POST">
                <button 
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Upgrade to PRO ($15/mo)
                </button>
              </form>
            </div>
          </div>

          {/* Usage Metrics Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
            <h3 className="text-xl font-bold text-white mb-6">Current Usage</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-300">Agent Executions</span>
                  <span className="text-zinc-400">42 / 100</span>
                </div>
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[42%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-300">Cloud Storage</span>
                  <span className="text-zinc-400">2.1 GB / 5 GB</span>
                </div>
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[42%]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
