'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Check, Phone, CreditCard, AlertCircle, ArrowUpRight, CheckCircle } from 'lucide-react';

interface SubscriptionData {
  tier: string;
  cycle: string;
  status: string;
  currentPeriodEnd: string;
}

interface QuotaData {
  storageBytesLimit: number;
  maxTrustees: number;
  maxBeneficiaries: number;
  allowVideoAudioMemos: boolean;
  allowWillBuilder: boolean;
  priorityTriage: boolean;
}

export default function BillingPage() {
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('0712345678');
  const [selectedTier, setSelectedTier] = useState<'HERITAGE' | 'DYNASTY'>('HERITAGE');
  const [mpesaLoading, setMpesaLoading] = useState(false);
  const [stkSent, setStkSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/billing/subscription')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setSub(json.data.subscription);
          setQuota(json.data.quota);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleMpesaPay = async (tier: 'HERITAGE' | 'DYNASTY') => {
    setMpesaLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/v1/billing/mpesa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phone,
          tier,
          cycle: 'ANNUAL',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStkSent(true);
        setMessage('M-Pesa STK prompt sent to your phone! Please enter your PIN to complete.');
      } else {
        setMessage(data.error || 'Failed to initiate M-Pesa STK push.');
      }
    } catch (e: unknown) {
      setMessage((e as Error).message || 'Failed to connect to M-Pesa gateway.');
    } finally {
      setMpesaLoading(false);
    }
  };

  const handleStripeCheckout = async (tier: 'HERITAGE' | 'DYNASTY') => {
    try {
      const res = await fetch('/api/v1/billing/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          cycle: 'ANNUAL',
          successUrl: window.location.href + '?success=true',
          cancelUrl: window.location.href,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
      }
    } catch (e) {
      alert('Failed to initialize Stripe checkout session.');
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-500">Loading subscription details...</div>;
  }

  const currentTier = sub?.tier || 'STARTER';
  const limitGb = quota ? Math.round(quota.storageBytesLimit / (1024 * 1024 * 1024)) : 1;

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing & Subscriptions</h1>
        <p className="text-sm text-slate-500">
          Manage your digital estate vault capacity, trustee limits, and legal succession features.
        </p>
      </div>

      {/* Current Subscription Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {sub?.status || 'ACTIVE'}
            </span>
            <h2 className="text-lg font-bold text-slate-900">{currentTier} PLAN</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Storage Quota: <strong>{limitGb} GB Encrypted Vault</strong> | Max Trustees: <strong>{quota?.maxTrustees || 2}</strong>
          </p>
          <div className="w-full md:w-80 bg-slate-100 rounded-full h-2.5 mt-3">
            <div className="bg-slate-900 h-2.5 rounded-full" style={{ width: '12%' }}></div>
          </div>
          <span className="text-xs text-slate-400 mt-1 block">120 MB of {limitGb} GB used</span>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400 block">Renews on</span>
          <span className="text-sm font-medium text-slate-700">
            {sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'N/A'}
          </span>
        </div>
      </div>

      {/* M-Pesa Notification Feedback */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 text-sm ${stkSent ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
          {stkSent ? <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
          <span>{message}</span>
        </div>
      )}

      {/* Subscription Plans Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Starter Plan */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Basic Custody</span>
            <h3 className="text-xl font-bold text-slate-900 mt-1">Starter</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-slate-900">FREE</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Essential estate custody for single individuals.</p>

            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 1 GB Encrypted Vault</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 2 Verified Trustees</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 3 Beneficiaries</li>
              <li className="flex items-center gap-2 text-slate-400"><Check className="w-4 h-4 text-slate-300" /> Two-person release protocol</li>
            </ul>
          </div>

          <button
            disabled={currentTier === 'STARTER'}
            className="mt-8 w-full py-2.5 px-4 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 bg-slate-50 disabled:opacity-50"
          >
            {currentTier === 'STARTER' ? 'Current Plan' : 'Downgrade to Starter'}
          </button>
        </div>

        {/* Heritage Plan */}
        <div className="bg-white border-2 border-slate-900 rounded-xl p-6 flex flex-col justify-between shadow-md relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wide">
            Recommended
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">Family Estate</span>
            <h3 className="text-xl font-bold text-slate-900 mt-1">Heritage</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-slate-900">KES 4,999</span>
              <span className="text-xs text-slate-500">/ year (~$39.99)</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Comprehensive protection for family estates & digital assets.</p>

            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> <strong>25 GB</strong> Encrypted Vault</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> <strong>5 Verified Trustees</strong></li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> <strong>Unlimited Beneficiaries</strong></li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> <strong>Video & Voice Legacy Memos</strong></li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> <strong>Interactive Statutory Will Builder</strong></li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Priority Dual-Custody Triage</li>
            </ul>
          </div>

          <div className="mt-8 space-y-2">
            <button
              onClick={() => handleMpesaPay('HERITAGE')}
              disabled={mpesaLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>Pay with M-Pesa (KES 4,999)</span>
            </button>
            <button
              onClick={() => handleStripeCheckout('HERITAGE')}
              className="w-full py-2 px-4 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>International Card ($39.99)</span>
            </button>
          </div>
        </div>

        {/* Dynasty Plan */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Generational Custody</span>
            <h3 className="text-xl font-bold text-slate-900 mt-1">Dynasty</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-slate-900">KES 19,999</span>
              <span className="text-xs text-slate-500">/ lifetime (~$149.99)</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Perpetual estate preservation with concierge advocate support.</p>

            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> <strong>100 GB</strong> Encrypted Vault</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> <strong>Unlimited Trustees & Beneficiaries</strong></li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> High-Resolution 4K Video Messages</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Physical Will Custody Registry</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Concierge Estate Onboarding</li>
            </ul>
          </div>

          <div className="mt-8 space-y-2">
            <button
              onClick={() => handleMpesaPay('DYNASTY')}
              disabled={mpesaLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>Pay with M-Pesa (KES 19,999)</span>
            </button>
            <button
              onClick={() => handleStripeCheckout('DYNASTY')}
              className="w-full py-2 px-4 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>International Card ($149.99)</span>
            </button>
          </div>
        </div>
      </div>

      {/* M-Pesa Mobile Number Input Helper */}
      <div className="bg-slate-100 rounded-xl p-5 border border-slate-200 max-w-md">
        <label className="text-xs font-bold text-slate-700 block uppercase tracking-wide">
          M-Pesa Safaricom Mobile Number
        </label>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0712345678 or 254712345678"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <span className="text-[11px] text-slate-500 mt-1 block">
          Enter your Safaricom mobile number to receive the Daraja STK PIN prompt.
        </span>
      </div>
    </div>
  );
}
