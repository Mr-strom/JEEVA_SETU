export const DELAY_REASONS = [
  'TRAFFIC_CONGESTION',
  'AMBULANCE_BREAKDOWN',
  'DELAYED_AMBULANCE_DISPATCH',
  'WEATHER_ROAD_CONDITION',
  'PATIENT_PREPARATION_DELAY',
  'OTHER_LOGISTICAL_DELAY',
] as const;

export type DelayReason = (typeof DELAY_REASONS)[number];

export interface RecordArrivalData {
  arrivedAt?: string | null;
  delayReason?: DelayReason | string | null;
  note?: string | null;
}

export class TransportService {
  isValidDelayReason(reason?: string | null): boolean {
    if (!reason) return true;
    return DELAY_REASONS.includes(reason as DelayReason) || reason === 'OTHER';
  }
}

export const transportService = new TransportService();
