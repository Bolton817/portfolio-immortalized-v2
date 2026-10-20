-- ==============================================================================
-- Portfolio Immortalized — Supabase Row Level Security (RLS) Policy Baseline
-- Reference: TDD Chapter 22.3 & 22.4
-- ==============================================================================

-- 1. Enable RLS across all domain tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trustee_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiary_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_object_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE legacy_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE legacy_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE death_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE death_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_grant_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;

-- 2. User Profiles Policies
CREATE POLICY "Users can view and update their own profile"
  ON user_profiles
  FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- 3. Assets & Versions (Owner Scoped)
CREATE POLICY "Owners can view and manage their own assets"
  ON assets
  FOR ALL
  USING (auth.uid()::text = owner_id)
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "Owners can view versions of their own assets"
  ON asset_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assets
      WHERE assets.id = asset_versions.asset_id
        AND assets.owner_id = auth.uid()::text
    )
  );

-- 4. Key Envelopes & Storage Objects (STRICT CONFIDENTIALITY)
-- NEVER allow direct browser client SELECT on key envelopes or storage paths
CREATE POLICY "No direct client access to key envelopes"
  ON key_envelopes
  FOR ALL
  USING (false);

CREATE POLICY "No direct client access to raw storage refs"
  ON storage_object_refs
  FOR ALL
  USING (false);

-- 5. Trustee Relationships
CREATE POLICY "Owners can view and manage their trustees"
  ON trustee_relationships
  FOR ALL
  USING (auth.uid()::text = owner_id)
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "Trustees can view their own assignment record"
  ON trustee_relationships
  FOR SELECT
  USING (auth.uid()::text = person_user_id);

-- 6. Beneficiary Relationships
CREATE POLICY "Owners can view and manage their beneficiaries"
  ON beneficiary_relationships
  FOR ALL
  USING (auth.uid()::text = owner_id)
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "Beneficiaries can view their own relationship record"
  ON beneficiary_relationships
  FOR SELECT
  USING (auth.uid()::text = person_user_id);

-- 7. Controlled Release Grants (Beneficiary Access)
CREATE POLICY "Beneficiaries can view only active, valid grants addressed to them"
  ON release_grants
  FOR SELECT
  USING (
    status = 'ACTIVE'
    AND expires_at > NOW()
    AND revoked_at IS NULL
    AND EXISTS (
      SELECT 1 FROM beneficiary_relationships
      WHERE beneficiary_relationships.id = release_grants.beneficiary_id
        AND beneficiary_relationships.person_user_id = auth.uid()::text
    )
  );

-- 8. Audit Events & Outbox (Tamper Resistance)
CREATE POLICY "No direct client mutations on audit events"
  ON audit_events
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Users can only view their own audit history"
  ON audit_events
  FOR SELECT
  USING (auth.uid()::text = actor_id);
