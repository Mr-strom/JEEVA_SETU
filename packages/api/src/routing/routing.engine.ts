import { RoutingRequest, RoutingSuggestionResult, FacilityCandidate } from './routing.types';

// Default scoring weights (deterministic, transparent)
export const ROUTING_WEIGHTS = {
  DISTRICT_MATCH: 40, // requires clinical/ops approval
  SPECIALTY_MATCH: 30, // requires clinical/ops approval
  CAPACITY_BEDS: 20, // requires clinical/ops approval
  TERTIARY_TIER: 10, // requires clinical/ops approval
};

// Maternal risk flag to required facility specialties mapping
export const RISK_SPECIALTY_MAP: Record<string, string[]> = {
  SEVERE_ANAEMIA: ['BLOOD_BANK', 'OBSTETRICS'], // requires clinical/ops approval
  PRE_ECLAMPSIA: ['ICU', 'OBSTETRICS', 'HDU'], // requires clinical/ops approval
  ECLAMPSIA_CONVULSIONS: ['ICU', 'OBSTETRICS'], // requires clinical/ops approval
  ANTEPARTUM_HAEMORRHAGE: ['BLOOD_BANK', 'OBSTETRICS', 'OT'], // requires clinical/ops approval
  OBSTRUCTED_LABOUR: ['OT', 'OBSTETRICS', 'NICU'], // requires clinical/ops approval
  PREVIOUS_LSCS: ['OT', 'OBSTETRICS'], // requires clinical/ops approval
  TWIN_PREGNANCY: ['NICU', 'OBSTETRICS'], // requires clinical/ops approval
  GESTATIONAL_DIABETES: ['OBSTETRICS'], // requires clinical/ops approval
};

/**
 * Pure deterministic ranking function for suggesting alternate referral facilities.
 * Excludes rejecting and sending facilities, ranks candidates by clinical needs and proximity.
 */
export function calculateRoutingSuggestions(request: RoutingRequest): RoutingSuggestionResult[] {
  const {
    sendingFacilityId,
    rejectingFacilityId,
    district,
    riskFlags,
    candidateFacilities,
  } = request;

  // 1. Filter out rejecting facility, sending facility, and inactive facilities
  const eligibleCandidates = candidateFacilities.filter(
    (c) =>
      c.isActive &&
      c.id !== rejectingFacilityId &&
      c.id !== sendingFacilityId,
  );

  if (eligibleCandidates.length === 0) {
    return [];
  }

  // 2. Identify required specialties from maternal risk flags
  const requiredSpecialties = new Set<string>(['OBSTETRICS']);
  riskFlags.forEach((flag) => {
    const specs = RISK_SPECIALTY_MAP[flag] || [];
    specs.forEach((s) => requiredSpecialties.add(s));
  });

  // 3. Score each candidate
  const scored = eligibleCandidates.map((candidate) => {
    let score = 0;
    const reasons: string[] = [];

    // Criteria A: Same District Match
    if (candidate.district.toLowerCase() === district.toLowerCase()) {
      score += ROUTING_WEIGHTS.DISTRICT_MATCH;
      reasons.push(`Same District (${candidate.district})`);
    } else {
      score += 15; // Nearby district base score // requires clinical/ops approval
      reasons.push(`Adjacent District (${candidate.district})`);
    }

    // Criteria B: Clinical Specialties & Capabilities Match
    const candidateSpecs = (candidate.specialties || []).map((s) => s.toUpperCase());
    let matchedCount = 0;
    requiredSpecialties.forEach((spec) => {
      if (candidateSpecs.includes(spec.toUpperCase())) {
        matchedCount++;
      }
    });

    const specialtyMatchRatio = requiredSpecialties.size > 0 ? matchedCount / requiredSpecialties.size : 1;
    const specialtyScore = Math.round(specialtyMatchRatio * ROUTING_WEIGHTS.SPECIALTY_MATCH);
    score += specialtyScore;
    if (matchedCount > 0) {
      reasons.push(`Matched ${matchedCount}/${requiredSpecialties.size} required maternal services`);
    }

    // Criteria C: Bed Capacity Tier
    if (candidate.capacityBeds && candidate.capacityBeds >= 100) {
      score += ROUTING_WEIGHTS.CAPACITY_BEDS;
      reasons.push(`High bed capacity (${candidate.capacityBeds} beds)`);
    } else if (candidate.capacityBeds && candidate.capacityBeds >= 30) {
      score += Math.round(ROUTING_WEIGHTS.CAPACITY_BEDS * 0.6);
      reasons.push(`Moderate bed capacity (${candidate.capacityBeds} beds)`);
    }

    // Criteria D: Tertiary / Medical College Tier
    if (candidate.type === 'MC' || candidate.type === 'DH' || candidate.type === 'TERTIARY') {
      score += ROUTING_WEIGHTS.TERTIARY_TIER;
      reasons.push('Tertiary Referral / Medical College Center');
    }

    return {
      suggestedFacilityId: candidate.id,
      suggestedFacility: candidate,
      score,
      reasons,
    };
  });

  // 4. Sort descending by score; break ties deterministically by facility name and ID
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return (
      (a.suggestedFacility.name || '').localeCompare(b.suggestedFacility.name || '') ||
      a.suggestedFacilityId.localeCompare(b.suggestedFacilityId)
    );
  });

  return scored.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}
