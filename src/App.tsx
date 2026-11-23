import { useState } from 'react';
import { AppDatabase } from './db/database';
import type { Food } from './db/schema';
import { FoodSearch } from './components/FoodSearch';

const db = new AppDatabase();

function App() {
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);

  return (
    <div>
      <h1>Kalori Takip</h1>
      <FoodSearch db={db} onSelect={setSelectedFood} />
      {selectedFood && <p>Seçilen: {selectedFood.name}</p>}
    </div>
  );
}

export default App;
