import { describe, expect, test } from 'vitest';
import { computeDailyGoal } from './calorieGoal';
import type { UserProfile } from '../db/schema';

describe('computeDailyGoal', () => {
  test('erkek, sedanter, kilo koruma için Mifflin-St Jeor BMR*1.2 hesaplar', () => {
    const profile: UserProfile = {
      age: 30,
      weightKg: 80,
      heightCm: 180,
      gender: 'male',
      activityLevel: 'sedentary',
      goal: 'maintain',
    };
    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    // TDEE = 1780 * 1.2 = 2136
    const goal = computeDailyGoal(profile);
    expect(goal.kcal).toBeCloseTo(2136, 0);
  });

  test('kadın için Mifflin-St Jeor farklı sabit kullanır', () => {
    const profile: UserProfile = {
      age: 25,
      weightKg: 60,
      heightCm: 165,
      gender: 'female',
      activityLevel: 'sedentary',
      goal: 'maintain',
    };
    // BMR = 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    // TDEE = 1345.25 * 1.2 = 1614.3
    const goal = computeDailyGoal(profile);
    expect(goal.kcal).toBeCloseTo(1614.3, 0);
  });

  test('kilo verme hedefi günlük kcal\'den 500 düşer', () => {
    const base: UserProfile = {
      age: 30,
      weightKg: 80,
      heightCm: 180,
      gender: 'male',
      activityLevel: 'sedentary',
      goal: 'maintain',
    };
    const maintainGoal = computeDailyGoal(base);
    const loseGoal = computeDailyGoal({ ...base, goal: 'lose' });
    expect(loseGoal.kcal).toBeCloseTo(maintainGoal.kcal - 500, 0);
  });

  test('kilo alma hedefi günlük kcal\'e 500 ekler', () => {
    const base: UserProfile = {
      age: 30,
      weightKg: 80,
      heightCm: 180,
      gender: 'male',
      activityLevel: 'sedentary',
      goal: 'maintain',
    };
    const maintainGoal = computeDailyGoal(base);
    const gainGoal = computeDailyGoal({ ...base, goal: 'gain' });
    expect(gainGoal.kcal).toBeCloseTo(maintainGoal.kcal + 500, 0);
  });

  test('makrolar kcal\'den standart oranla türetilir (protein/yağ/karbon %30/30/40, lif 14g/1000kcal)', () => {
    const profile: UserProfile = {
      age: 30,
      weightKg: 80,
      heightCm: 180,
      gender: 'male',
      activityLevel: 'sedentary',
      goal: 'maintain',
    };
    const goal = computeDailyGoal(profile);
    expect(goal.protein).toBeCloseTo((goal.kcal * 0.3) / 4, 0);
    expect(goal.fat).toBeCloseTo((goal.kcal * 0.3) / 9, 0);
    expect(goal.carb).toBeCloseTo((goal.kcal * 0.4) / 4, 0);
    expect(goal.fiber).toBeCloseTo((goal.kcal / 1000) * 14, 1);
  });

  test('aktivite seviyesi arttıkça kcal hedefi artar', () => {
    const base: UserProfile = {
      age: 30,
      weightKg: 80,
      heightCm: 180,
      gender: 'male',
      activityLevel: 'sedentary',
      goal: 'maintain',
    };
    const sedentary = computeDailyGoal(base);
    const active = computeDailyGoal({ ...base, activityLevel: 'active' });
    expect(active.kcal).toBeGreaterThan(sedentary.kcal);
  });
});
