import React, { useState } from "react";

const QUICK_CITIES = ["Oran", "London", "Tokyo", "New York", "Paris"];

export default function SearchBar({ onSearch, onUseLocation, loading }) {
    const [query, setQuery] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query.trim());
        }
    };

    const handleChipClick = (city) => {
        setQuery(city);
        onSearch(city);
    };

    return (
        <div className="search-section">
            <form className="search-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    className="search-input"
                    placeholder="City, postal code, landmark, or coordinates"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={loading}
                />
                <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()}>
                    {loading ? "Searching..." : "Search"}
                </button>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onUseLocation}
                    disabled={loading}
                    title="Detect GPS coordinates using browser Geolocation"
                >
                    Use My Location
                </button>
            </form>

            <div className="chips-row">
                <span className="chips-label">Try:</span>
                {QUICK_CITIES.map((city) => (
                    <button
                        key={city}
                        type="button"
                        className="chip"
                        onClick={() => handleChipClick(city)}
                        disabled={loading}
                    >
                        {city}
                    </button>
                ))}
            </div>
        </div>
    );
}