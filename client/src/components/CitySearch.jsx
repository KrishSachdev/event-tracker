// A search box to change the city
import { useEffect, useState } from 'react';

export default function CitySearch({ city, onSearch }) {
  const [value, setValue] = useState(city);

  // If the city changes from outside (e.g. profile saved), update the box
  useEffect(() => setValue(city), [city]);

  function handleSubmit(e) {
    e.preventDefault();
    onSearch(value.trim());
  }

  return (
    <form className="city-search" onSubmit={handleSubmit}>
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Search a city, e.g. London" />
      <button className="btn">Search</button>
    </form>
  );
}
