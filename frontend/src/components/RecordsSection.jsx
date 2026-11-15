import React, { useState, useEffect } from "react";
import { API_BASE_URL, createRecord, updateRecord, deleteRecord, fetchRecordExtras } from "../api.js";

function getIsoDate(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split("T")[0];
}

export default function RecordsSection({ records, onRecordsChange, currentLocationQuery }) {
    const [location, setLocation] = useState(currentLocationQuery || "Oran");
    const [startDate, setStartDate] = useState(getIsoDate(-3));
    const [endDate, setEndDate] = useState(getIsoDate(0));
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const [expandedId, setExpandedId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editNote, setEditNote] = useState("");
    const [extras, setExtras] = useState({});

    useEffect(() => {
        if (currentLocationQuery) setLocation(currentLocationQuery);
    }, [currentLocationQuery]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormError("");
        setSaving(true);
        try {
            await createRecord({ location, start_date: startDate, end_date: endDate, note: note.trim() });
            setNote("");
            await onRecordsChange();
        } catch (err) {
            setFormError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this record from database?")) return;
        try {
            await deleteRecord(id);
            await onRecordsChange();
        } catch (err) {
            alert(err.message);
        }
    };

    const saveEdit = async (id) => {
        try {
            await updateRecord(id, { note: editNote });
            setEditingId(null);
            await onRecordsChange();
        } catch (err) {
            alert(err.message);
        }
    };

    const toggleExtras = async (id) => {
        if (extras[id]) {
            const copy = { ...extras };
            delete copy[id];
            setExtras(copy);
            return;
        }
        try {
            const data = await fetchRecordExtras(id);
            setExtras((prev) => ({ ...prev, [id]: data }));
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div className="card records-card">
            <div className="card-top">
                <div>
                    <span className="badge">Database Persistence</span>
                    <h3 className="section-title">Saved Weather Records (CRUD)</h3>
                </div>

                {/* 2.3 Data Export Toolbar */}
                <div className="export-toolbar">
                    <span className="export-label">Export:</span>
                    {["json", "csv", "xml", "pdf", "md"].map((f) => (
                        <a key={f} href={`${API_BASE_URL}/export/${f}`} target="_blank" rel="noreferrer" className="export-pill">
                            {f.toUpperCase()}
                        </a>
                    ))}
                </div>
            </div>

            {/* CREATE FORM */}
            <form className="crud-form" onSubmit={handleCreate}>
                <div className="form-group">
                    <label>Location</label>
                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>End Date</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                </div>
                <div className="form-group flex-2">
                    <label>Trip Note (Optional)</label>
                    <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g., Summer vacation" />
                </div>
                <button type="submit" className="btn btn-primary form-submit-btn" disabled={saving}>
                    {saving ? "Saving..." : "Save Record"}
                </button>
            </form>

            {formError && <div className="alert-error">{formError}</div>}

            {/* READ: RECORDS LIST */}
            <div className="records-list">
                <h4 className="records-count">Saved Records ({records.length})</h4>
                {records.length === 0 ? (
                    <p className="empty-text">No records saved yet. Use the form above to add one.</p>
                ) : (
                    records.map((r) => (
                        <div key={r.id} className="record-item">
                            <div className="record-header">
                                <div>
                                    <span className="record-badge">#{r.id}</span>
                                    <strong className="record-title">{r.location}</strong>
                                    <span className="record-dates"> ({r.start_date} to {r.end_date})</span>
                                </div>
                                <div className="btn-group">
                                    <button type="button" className="btn-sm btn-action" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                                        {expandedId === r.id ? "Hide Temps ▲" : "View Temps ▼"}
                                    </button>
                                    <button type="button" className="btn-sm btn-action" onClick={() => toggleExtras(r.id)}>
                                        {extras[r.id] ? "Hide Info" : "Place Info"}
                                    </button>
                                    <button type="button" className="btn-sm btn-danger" onClick={() => handleDelete(r.id)}>
                                        Delete
                                    </button>
                                </div>
                            </div>

                            {/* Note Row / UPDATE */}
                            <div className="note-row">
                                {editingId === r.id ? (
                                    <div className="inline-edit">
                                        <input type="text" value={editNote} onChange={(e) => setEditNote(e.target.value)} autoFocus />
                                        <button type="button" className="btn-sm btn-primary" onClick={() => saveEdit(r.id)}>Save</button>
                                        <button type="button" className="btn-sm btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                                    </div>
                                ) : (
                                    <div className="note-display">
                                        <span><strong>Note:</strong> {r.note || <em>No note</em>}</span>
                                        <button type="button" className="btn-inline-link" onClick={() => { setEditingId(r.id); setEditNote(r.note || ""); }}>
                                            Edit Note
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Collapsible Daily Temperatures Table */}
                            {expandedId === r.id && (
                                <div className="table-wrapper">
                                    <table className="mini-table">
                                        <thead>
                                            <tr><th>Date</th><th>Min Temp</th><th>Max Temp</th></tr>
                                        </thead>
                                        <tbody>
                                            {r.temps.map((t) => (
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

                            {/* 2.2 Extras Panel (Google Maps, YouTube, Wikipedia) */}
                            {extras[r.id] && (
                                <div className="extras-box">
                                    {extras[r.id].wikipedia_summary && (
                                        <p className="extras-summary">
                                            <strong>About {r.location.split(",")[0]}:</strong> {extras[r.id].wikipedia_summary}
                                        </p>
                                    )}
                                    <div className="extras-links">
                                        <a href={extras[r.id].google_maps_url} target="_blank" rel="noreferrer">
                                            View on Google Maps ↗
                                        </a>
                                        <a href={extras[r.id].youtube_search_url} target="_blank" rel="noreferrer">
                                            Watch on YouTube ↗
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}