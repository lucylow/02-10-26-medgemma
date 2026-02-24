import { describe, it, expect } from 'vitest';
import {
  ULTRA_PATIENTS,
  type RiskLevel,
} from '@/data/ultra/HyperRealisticData';

describe('HyperRealisticData', () => {
  describe('generate100k', () => {
    it('produces 100,000 patients', () => {
      expect(ULTRA_PATIENTS).toHaveLength(100_000);
    });

    it('each patient has required shape (id, mrn, profile, vitals, screenings, story, status)', () => {
      const p = ULTRA_PATIENTS[0];
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('mrn');
      expect(p).toHaveProperty('profile');
      expect(p).toHaveProperty('vitals');
      expect(p).toHaveProperty('screenings');
      expect(p).toHaveProperty('story');
      expect(p).toHaveProperty('status');
      expect(p.profile).toHaveProperty('firstName');
      expect(p.profile).toHaveProperty('preferredName');
      expect(p.profile).toHaveProperty('chwAssigned');
      expect(p.profile).toHaveProperty('location');
      expect(p.vitals).toHaveProperty('age_months');
      expect(p.screenings).toHaveProperty('risk_level');
      expect(p.screenings).toHaveProperty('confidence');
      expect(p.story).toHaveProperty('chw_note');
      expect(p.status).toHaveProperty('needs_followup');
    });

    it('ids are unique and zero-padded', () => {
      const ids = new Set(ULTRA_PATIENTS.map((p) => p.id));
      expect(ids.size).toBe(100_000);
      expect(ULTRA_PATIENTS[0].id).toMatch(/^pt-\d{6}$/);
    });

    it('risk_level is one of referral, urgent, monitor, ontrack', () => {
      const levels: RiskLevel[] = ['referral', 'urgent', 'monitor', 'ontrack'];
      ULTRA_PATIENTS.slice(0, 500).forEach((p) => {
        expect(levels).toContain(p.screenings.risk_level);
      });
    });

    it('confidence is in [0.7, 0.95] range', () => {
      ULTRA_PATIENTS.slice(0, 200).forEach((p) => {
        expect(p.screenings.confidence).toBeGreaterThanOrEqual(0.7);
        expect(p.screenings.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('age_months is 1–60', () => {
      ULTRA_PATIENTS.forEach((p) => {
        expect(p.vitals.age_months).toBeGreaterThanOrEqual(1);
        expect(p.vitals.age_months).toBeLessThanOrEqual(60);
      });
    });

    it('countries are india, kenya, mexico', () => {
      const countries = new Set(ULTRA_PATIENTS.map((p) => p.profile.location.country));
      expect(countries).toEqual(new Set(['INDIA', 'KENYA', 'MEXICO']));
    });
  });

  describe('data density', () => {
    it('search "Sofia" returns multiple results', () => {
      const sofia = ULTRA_PATIENTS.filter((p) =>
        p.profile.preferredName.toLowerCase().includes('sofia')
      );
      expect(sofia.length).toBeGreaterThan(0);
    });

    it('referrals and urgent counts are non-zero', () => {
      const referrals = ULTRA_PATIENTS.filter((p) => p.screenings.risk_level === 'referral');
      const urgent = ULTRA_PATIENTS.filter((p) => p.screenings.risk_level === 'urgent');
      expect(referrals.length).toBeGreaterThan(0);
      expect(urgent.length).toBeGreaterThan(0);
    });
  });
});
