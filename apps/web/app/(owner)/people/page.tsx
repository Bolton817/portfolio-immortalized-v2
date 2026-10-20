'use client';

import { useState } from 'react';
import { UserPlus, ShieldAlert, CheckCircle2, Clock, Mail, Heart } from 'lucide-react';

interface Trustee {
  id: string;
  name: string;
  email: string;
  relationshipType: string;
  status: 'INVITED' | 'ACCEPTED';
  acceptanceUrl?: string;
}

interface Beneficiary {
  id: string;
  name: string;
  email: string;
  relationshipType: string;
  personalNote?: string;
}

export default function PeopleManagerPage() {
  const [activeTab, setActiveTab] = useState<'trustees' | 'beneficiaries'>('trustees');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isBeneficiaryModalOpen, setIsBeneficiaryModalOpen] = useState(false);

  // Initial state demonstrating sample trustees and beneficiaries
  const [trustees, setTrustees] = useState<Trustee[]>([
    {
      id: 't-1',
      name: 'Sarah Mwangi',
      email: 'sarah.mwangi@example.com',
      relationshipType: 'PROFESSIONAL',
      status: 'ACCEPTED',
    },
  ]);

  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([
    {
      id: 'b-1',
      name: 'Maya Mutua',
      email: 'maya.mutua@example.com',
      relationshipType: 'CHILD',
      personalNote: 'To receive family photographs and property records',
    },
  ]);

  // Form states
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteType, setInviteType] = useState('PROFESSIONAL');
  const [inviteMessage, setInviteMessage] = useState('');
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

  const [benName, setBenName] = useState('');
  const [benEmail, setBenEmail] = useState('');
  const [benType, setBenType] = useState('CHILD');
  const [benNote, setBenNote] = useState('');

  const activeTrusteeCount = trustees.filter((t) => t.status === 'ACCEPTED').length;
  const isQuorumMet = activeTrusteeCount >= 2;

  const handleInviteTrustee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;

    const mockToken = `demo_tok_${Math.random().toString(36).substring(2, 10)}`;
    const newTrustee: Trustee = {
      id: `t-${Date.now()}`,
      name: inviteName,
      email: inviteEmail,
      relationshipType: inviteType,
      status: 'INVITED',
      acceptanceUrl: `/trustee/accept?token=${mockToken}`,
    };

    setTrustees([...trustees, newTrustee]);
    setLastInviteLink(`/trustee/accept?token=${mockToken}`);
    setInviteName('');
    setInviteEmail('');
    setInviteMessage('');
    setIsInviteModalOpen(false);
  };

  const handleAddBeneficiary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!benName || !benEmail) return;

    const newBen: Beneficiary = {
      id: `b-${Date.now()}`,
      name: benName,
      email: benEmail,
      relationshipType: benType,
      personalNote: benNote,
    };

    setBeneficiaries([...beneficiaries, newBen]);
    setBenName('');
    setBenEmail('');
    setBenNote('');
    setIsBeneficiaryModalOpen(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Your Trusted Network</h1>
          <p className="text-sm text-slate-500 mt-1">
            Nominate independent trustees to safeguard verification and designate beneficiaries for specific items.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {activeTab === 'trustees' ? (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm inline-flex items-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Trustee</span>
            </button>
          ) : (
            <button
              onClick={() => setIsBeneficiaryModalOpen(true)}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm inline-flex items-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Beneficiary</span>
            </button>
          )}
        </div>
      </div>

      {/* Quorum Warning or Safeguard Banner */}
      {!isQuorumMet ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start space-x-4">
          <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold text-amber-950">Trustee Quorum Incomplete (1 of 2 Enrolled)</h2>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              To prevent accidental or unauthorized vault releases, our policy requires at least two separately authenticated trustees before a future release plan can be executed.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start space-x-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold text-emerald-950">Trustee Quorum Satisfied ({activeTrusteeCount} Active)</h2>
            <p className="text-xs text-emerald-800 mt-1">
              Your network meets the required dual-trustee independent verification standard.
            </p>
          </div>
        </div>
      )}

      {/* Link Notification Toast if recently invited */}
      {lastInviteLink && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between text-xs text-blue-900">
          <div>
            <span className="font-semibold">Simulated Invitation Sent via Brevo:</span> Invitation link generated.
          </div>
          <a
            href={lastInviteLink}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Open Trustee Acceptance View &rarr;
          </a>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('trustees')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'trustees'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Trustees ({trustees.length})
        </button>
        <button
          onClick={() => setActiveTab('beneficiaries')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'beneficiaries'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Beneficiaries ({beneficiaries.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'trustees' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trustees.map((trustee) => (
            <div key={trustee.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{trustee.name}</h3>
                  <span className="text-xs font-mono text-slate-500">{trustee.relationshipType}</span>
                </div>
                {trustee.status === 'ACCEPTED' ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Active Trustee</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Invite Pending</span>
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{trustee.email}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Zero implicit vault access</span>
                <button
                  onClick={() => setTrustees(trustees.filter((t) => t.id !== trustee.id))}
                  className="text-rose-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {beneficiaries.map((ben) => (
            <div key={ben.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{ben.name}</h3>
                  <span className="text-xs font-mono text-slate-500">{ben.relationshipType}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  Beneficiary
                </span>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{ben.email}</span>
                </div>
                {ben.personalNote && (
                  <div className="flex items-start space-x-2 mt-2">
                    <Heart className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-500 italic">{ben.personalNote}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Receives only assigned items</span>
                <button
                  onClick={() => setBeneficiaries(beneficiaries.filter((b) => b.id !== ben.id))}
                  className="text-rose-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Trustee Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-slate-900">Appoint a Trustee</h2>
            <p className="text-xs text-slate-500">
              Trustees assist in future status reviews and evidence verification. They will never have access to browse your private vault.
            </p>

            <form onSubmit={handleInviteTrustee} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Dr. Jane Doe"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="jane.doe@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Relationship</label>
                <select
                  value={inviteType}
                  onChange={(e) => setInviteType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="PROFESSIONAL">Professional / Attorney / Doctor</option>
                  <option value="FAMILY">Family Member</option>
                  <option value="FRIEND">Trusted Friend</option>
                  <option value="LEGAL_REPRESENTATIVE">Legal Representative</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Personal Note (Optional)</label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Explaining why you have appointed them..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 shadow-sm"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Beneficiary Modal */}
      {isBeneficiaryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-slate-900">Add a Beneficiary</h2>
            <p className="text-xs text-slate-500">
              Beneficiaries will receive access only to the specific vault items and messages you explicitly assign to them.
            </p>

            <form onSubmit={handleAddBeneficiary} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={benName}
                  onChange={(e) => setBenName(e.target.value)}
                  placeholder="e.g. David Mutua"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={benEmail}
                  onChange={(e) => setBenEmail(e.target.value)}
                  placeholder="david@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Relationship</label>
                <select
                  value={benType}
                  onChange={(e) => setBenType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="CHILD">Child</option>
                  <option value="SPOUSE">Spouse / Partner</option>
                  <option value="SIBLING">Sibling</option>
                  <option value="PARENT">Parent</option>
                  <option value="FRIEND">Friend</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Private Note (Optional)</label>
                <textarea
                  value={benNote}
                  onChange={(e) => setBenNote(e.target.value)}
                  placeholder="Special instructions or notes for this beneficiary..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsBeneficiaryModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 shadow-sm"
                >
                  Save Beneficiary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
