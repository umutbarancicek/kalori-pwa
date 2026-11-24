import { useEffect, useState } from 'react';
import './App.css';
import { AppDatabase } from './db/database';
import type { DailyGoal, MealType, UserProfile } from './db/schema';
import { AddScreen } from './components/AddScreen';
import { BottomNav, type AppView } from './components/BottomNav';
import { DiaryScreen } from './components/DiaryScreen';
import { PROFILE_SETTINGS_KEY } from './components/ProfileSettings';
import { SettingsScreen } from './components/SettingsScreen';
import { computeDailyGoal } from './domain/calorieGoal';
import { getMealTypeForTime } from './domain/diaryService';
import { seedBulkDataIfNeeded } from './db/seedBulkData';
import { fetchBulkFoodData, fetchGenericFoodData } from './lib/bulkDataSource';
import { getLocalDateString } from './lib/localDate';

const db = new AppDatabase();

function App() {
  const [view, setView] = useState<AppView>('diary');
  const [date, setDate] = useState(getLocalDateString());
  const [mealType, setMealType] = useState<MealType>(() =>
    getMealTypeForTime(new Date().getHours()),
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [visionApiKey, setVisionApiKey] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const goal: DailyGoal | null = profile ? computeDailyGoal(profile) : null;

  useEffect(() => {
    db.settings.get('visionApiKey').then((entry) => {
      if (entry) setVisionApiKey(entry.value as string);
    });
    db.settings.get(PROFILE_SETTINGS_KEY).then((entry) => {
      if (entry) setProfile(entry.value as UserProfile);
    });
    seedBulkDataIfNeeded(db, fetchBulkFoodData, fetchGenericFoodData);
  }, []);

  function handleNavigate(next: AppView) {
    if (next === 'add') {
      setMealType(getMealTypeForTime(new Date().getHours()));
    }
    setView(next);
  }

  function handleAddToMeal(meal: MealType) {
    setMealType(meal);
    setView('add');
  }

  function handleAddDone() {
    setRefreshKey((k) => k + 1);
    setView('diary');
  }

  return (
    <div className="app-shell">
      <h1>Kalori Takip</h1>

      {view === 'diary' && (
        <DiaryScreen
          db={db}
          date={date}
          onDateChange={setDate}
          refreshKey={refreshKey}
          onRefresh={() => setRefreshKey((k) => k + 1)}
          goal={goal}
          onAddToMeal={handleAddToMeal}
        />
      )}

      {view === 'add' && (
        <AddScreen
          db={db}
          date={date}
          mealType={mealType}
          onMealTypeChange={setMealType}
          visionApiKey={visionApiKey}
          onDone={handleAddDone}
        />
      )}

      {view === 'settings' && (
        <SettingsScreen
          db={db}
          visionApiKey={visionApiKey}
          onSaved={setVisionApiKey}
          profile={profile}
          onProfileSaved={setProfile}
        />
      )}

      <BottomNav view={view} onNavigate={handleNavigate} />
    </div>
  );
}

export default App;
