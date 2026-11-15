import React, { useState } from "react";
import { API_BASE_URL, createRecord, updateRecord, deleteRecord, fetchRecordExtras } from "../api.js";

// Helper to get ISO date string offset from today
function getIsoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

export default function RecordsSection({ records, onRecordsChange, currentLocationQuery }) {
  // Create form state
  const [saveLocation, setSaveLocation] = useState(currentLocationQuery || "Oran");
  const [startDate, setStartDate] = useState(getIsoDate(-3));
  const [endDate, setEndDate] = useState(getIsoDate(0));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Record item expanded states
  const [expandedRecordId, setExpandedRecordId] = useState(null);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editNote, setEditNote] = useState("");
  const [extrasData, setExtrasData] = useState({});
  const [loadingExtrasId, setLoadingExtrasId] = useState(null);

  // Sync with current location if user searches a new city
  React.useEffect(() => {
    if (currentLocationQuery) {
      setSaveLocation(currentLocationQuery);
    }
  }, [currentLocationQuery]);

  // Handle Create
  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await createRecord({
        location: saveLocation,
        start_date: startDate,
        end_date: endDate,
        note: note.trim(),
      });
      setNote("");
      await onRecordsChange();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this weather record?")) return;
    try {
      await deleteRecord(id);
      await onRecordsChange();
    } catch (err) {
      alert(`Error deleting record: ${err.message}`);
    }
  };

  // Handle Update Note
  const startEditing = (record) => {
    setEditingRecordId(record.id);
    setEditNote(record.note || "");
  };

  const handleSaveUpdate = async (id) => {
    try {
      await updateRecord(id, { note: editNote });
      setEditingRecordId(null);
      await onRecordsChange();
    } catch (err) {
      alert(`Error updating record: ${err.message}`);
    }
  };

  // Handle Fetch Extras (Google Maps, YouTube, Wikipedia)
  const handleLoadExtras = async (id) => {
    if (extrasData[id]) {
      // Toggle off if already loaded
      const copy = { ...extrasData };
      delete copy[id];
      setExtrasData(copy);
      return;
    }

    setLoadingExtrasId(id);
    try {
      const data = await fetchRecordExtras(id);
      setExtrasData((prev) => ({ ...prev, [id]: data }));
    } catch (err) {
      alert(`Failed to load extra info: ${err.message}`);
    } finally {
      setLoadingExtrasId(null);
    }
  };

  return (
    <div className="card records-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">💾 Saved Weather Records &amp; CRUD Persistence</h3>
          <span className="card-subtitle">
            SQLite database storage with validation, temperature tracking, and multi-format exports
          </span>
        </div>

        {/* 2.3 Data Export Buttons */}
        <div className="export-toolbar">
          <span className="export-label">Export Data:</span>
          {["json", "csv", "xml", "pdf", "md"].map((fmt) => (
            <a
              key={fmt}
              href={`${API_BASE_URL}/export/${fmt}`}
              target="_blank"
              rel="noreferrer"
              className="export-btn"
              title={`Download all records as ${fmt.toUpperCase()}`}
            >
              {fmt.toUpperCase()}
            </a>
          ))}
        </div>
      </div>

      {/* CREATE FORM (Section 2.1) */}
      <form className="crud-form" onSubmit={handleCreate}>
        <div className="form-group">
          <label>Location</label>
          <input
            type="text"
            value={saveLocation}
            onChange={(e) => setSaveLocation(e.target.value)}
            placeholder="City or coordinates"
            required
          />
        </div>
        <div className="form-group">
          <label>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <div className="form-group flex-2">
          <label>Trip / Weather Note</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., Summer vacation, inspection trip"
          />
        </div>
        <button type="submit" className="btn btn-primary form-submit-btn" disabled={saving}>
          {saving ? "Saving..." : "Save to Database"}
        </button>
      </form>

      {formError && <div className="alert-box alert-error">{formError}</div>}

      {/* READ / LIST SAVED RECORDS */}
      <div className="records-list-section">
        <h4 className="records-count">
          Database Records ({records.length})
        </h4>

        {records.length === 0 ? (
          <p className="empty-notice">
            No weather records stored in SQLite yet. Use the form above to add one.
          </p>
        ) : (
          <div className="records-grid">
            {records.map((rec) => {
              const isExpanded = expandedRecordId === rec.id;
              const isEditing = editingRecordId === rec.id;
              const extras = extrasData[rec.id];

              return (
                <div key={rec.id} className="record-item">
                  <div className="record-header">
                    <div>
                      <h5 className="record-location">#{rec.id} - {rec.location}</h5>
                      <span className="record-dates">
                        📅 {rec.start_date} to {rec.end_date} ({rec.temps.length} days)
                      </span>
                    </div>
                    <div className="record-actions">
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => setExpandedRecordId(isExpanded ? null : rec.id)}
                      >
                        {isExpanded ? "Hide Temps ▲" : "View Temps ▼"}
                      </button>
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => handleLoadExtras(rec.id)}
                        disabled={loadingExtrasId === rec.id}
                      >
                        {loadingExtrasId === rec.id ? "Loading..." : extras ? "Hide Info" : "Place Info ℹ️"}
                      </button>
                      <button
                        type="button"
                        className="btn-link btn-link-danger"
                        onClick={() => handleDelete(rec.id)}
                      >
                        Delete 🗑️
                      </button>
                    </div>
                  </div>

                  {/* Note Row / Edit Note (UPDATE) */}
                  <div className="record-note-row">
                    {isEditing ? (
                      <div className="note-edit-inline">
                        <input
                          type="text"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="Update note..."
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleSaveUpdate(rec.id)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => setEditingRecordId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="note-display">
                        <span className="note-text">
                          <strong>Note:</strong> {rec.note || <em>No note attached.</em>}
                        </span>
                        <button
                          type="button"
                          className="btn-link btn-link-sm"
                          onClick={() => startEditing(rec)}
                        >
                          Edit Note ✏️
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Collapsible Daily Temperatures Table */}
                  {isExpanded && (
                    <div className="temps-table-wrapper">
                      <table className="temps-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Min Temp (°C)</th>
                            <th>Max Temp (°C)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rec.temps.map((t) => (
                            <tr key={t.date}>
                              <td>{t.date}</td>
                              <td>{t.min_temp}°C</td>
                              <td>{t.max_temp}°C</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 2.2 External Extras (Maps, YouTube, Wikipedia) */}
                  {extras && (
                    <div className="extras-panel">
                      {extras.wikipedia_summary && (
                        <p className="extras-summary">
                          <strong>About {rec.location.split(",")[0]}:</strong>{" "}
                          {extras.wikipedia_summary}
                        </p>
                      )}
                      <div className="extras-links">
                        <a
                          href={extras.google_maps_url}
                          target="_blank"
                          rel="noreferrer"
                          className="extra-chip"
                        >
                          🗺️ View on Google Maps
                        </a>
                        <a
                          href={extras.youtube_search_url}
                          target="_blank"
                          rel="noreferrer"
                          className="extra-chip"
                        >
                          📺 Watch Travel Videos on YouTube
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
