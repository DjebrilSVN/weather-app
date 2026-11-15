import React, { useState } from "react";

const SUGGESTIONS = ["Oran", "London", "Tokyo", "New York", "Paris"];

export default function SearchBar({ onSearch, onUseLocation, loading }) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleSuggestionClick = (city) => {
    setQuery(city);
    onSearch(city);
  };

  return (
    <div className="search-section">
      <form className="search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="search-input"
          placeholder="Enter city, postal code, landmark, or coordinates (e.g., 35.69, -0.63)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
          aria-label="Location"
        />
        <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()}>
          {loading ? "Searching..." : "Search"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onUseLocation}
          disabled={loading}
          title="Detect your current GPS coordinates"
        >
          📍 Use My Location
        </button>
      </form>

      <div className="suggestions-row">
        <span className="suggestions-label">Try:</span>
        {SUGGESTIONS.map((city) => (
          <button
            key={city}
            type="button"
            className="chip-btn"
            onClick={() => handleSuggestionClick(city)}
            disabled={loading}
          >
            {city}
          </button>
        ))}
      </div>
    </div>
  );
}
