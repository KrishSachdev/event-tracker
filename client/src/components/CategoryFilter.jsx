// Dropdown to pick an event category (Music, Sports, ...).
// The list of choices comes from the server.
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function CategoryFilter({ value, onChange }) {
  const [categories, setCategories] = useState([]);

  // Load the choices once
  useEffect(() => {
    api
      .getCategories()
      .then((data) => setCategories(data.categories))
      .catch(() => setCategories([]));
  }, []);

  if (categories.length === 0) return null;

  return (
    <label className="category-filter">
      Category
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>{category.label}</option>
        ))}
      </select>
    </label>
  );
}
