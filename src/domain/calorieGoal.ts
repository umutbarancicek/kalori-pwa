import type { ActivityLevel, DailyGoal, UserProfile, WeightGoal } from '../db/schema';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_KCAL_ADJUSTMENT: Record<WeightGoal, number> = {
  lose: -500,
  maintain: 0,
  gain: 500,
};

function computeBmr(profile: UserProfile): number {
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return profile.gender === 'male' ? base + 5 : base - 161;
}

export function computeDailyGoal(profile: UserProfile): DailyGoal {
  const bmr = computeBmr(profile);
  const tdee = bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel];
  const kcal = tdee + GOAL_KCAL_ADJUSTMENT[profile.goal];

  return {
    kcal,
    protein: (kcal * 0.3) / 4,
    fat: (kcal * 0.3) / 9,
    carb: (kcal * 0.4) / 4,
    fiber: (kcal / 1000) * 14,
  };
}
