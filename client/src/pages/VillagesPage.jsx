import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { villageService, sourceService } from '../services/api';
import SafetyBadge from '../components/common/SafetyBadge';
import { MapPin, Users, Droplets, ChevronRight, Plus, X, Check, ChevronLeft, Trash2, Navigation, Pencil, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const SOURCE_TYPES = [
  { value: 'borewell',   label: 'Borewell' },
  { value: 'well',       label: 'Well' },
  { value: 'water_tank', label: 'Water Tank' },
  { value: 'tap_water',  label: 'Tap Water' },
  { value: 'river',      label: 'River' },
  { value: 'lake',       label: 'Lake' },
  { value: 'hand_pump',  label: 'Hand Pump' },
];

const SOURCE_NAME_EXAMPLES = [
  'Village Borewell', 'School Water Tank', 'Community Well',
  'Panchayat Tank', 'Hospital Borewell',
];

const SOURCE_STATUSES = [
  { value: 'active',      label: '🟢 Active' },
  { value: 'inactive',    label: '⚫ Inactive' },
  { value: 'maintenance', label: '🟡 Maintenance' },
];

// ── Default form state ──────────────────────────────────────────────────────
const defaultVillage = { name: '', district: '', state: 'Telangana', population: '', lat: '', lng: '', description: '' };
const defaultSource  = { name: '', type: 'borewell', deviceId: '', lat: '', lng: '', installationDate: '', status: 'active' };

// ── GPS Button component ────────────────────────────────────────────────────
const GpsButton = ({ onLocate, fetching }) => (
  <button
    type="button"
    className="btn btn-secondary"
    onClick={onLocate}
    disabled={fetching}
    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 14px', whiteSpace: 'nowrap' }}
  >
    <Navigation size={14} style={{ animation: fetching ? 'spin 1s linear infinite' : 'none' }} />
    {fetching ? 'Locating…' : '📍 Use Current Location'}
  </button>
);

// ── 2-step modal ─────────────────────────────────────────────────────────────
const AddVillageModal = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1 = village info, 2 = sources
  const [village, setVillage]   = useState(defaultVillage);
  const [sources, setSources]   = useState([{ ...defaultSource }]);
  const [saving, setSaving]     = useState(false);
  const [createdVillage, setCreatedVillage] = useState(null);
  const [villageGpsFetching, setVillageGpsFetching] = useState(false);
  const [srcGpsFetching, setSrcGpsFetching] = useState([]);

  const setV = (key, val) => setVillage(v => ({ ...v, [key]: val }));
  const setS = (i, key, val) => setSources(s => s.map((src, idx) => idx === i ? { ...src, [key]: val } : src));
  const addRow    = () => setSources(s => [...s, { ...defaultSource }]);
  const removeRow = (i) => setSources(s => s.filter((_, idx) => idx !== i));

  // Village GPS
  const fetchVillageLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setVillageGpsFetching(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setV('lat', pos.coords.latitude.toFixed(6));
        setV('lng', pos.coords.longitude.toFixed(6));
        setVillageGpsFetching(false);
        toast.success('Village GPS captured!');
      },
      (err) => { setVillageGpsFetching(false); toast.error(err.message || 'Location access denied'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Source GPS per row
  const fetchSourceLocation = (i) => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setSrcGpsFetching(f => { const a = [...f]; a[i] = true; return a; });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setS(i, 'lat', pos.coords.latitude.toFixed(6));
        setS(i, 'lng', pos.coords.longitude.toFixed(6));
        setSrcGpsFetching(f => { const a = [...f]; a[i] = false; return a; });
        toast.success(`GPS set for Source ${i + 1}!`);
      },
      (err) => {
        setSrcGpsFetching(f => { const a = [...f]; a[i] = false; return a; });
        toast.error(err.message || 'Location access denied');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Step 1 → submit village
  const handleCreateVillage = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: village.name.trim(),
        district: village.district.trim(),
        state: village.state.trim(),
        population: Number(village.population) || 0,
        description: village.description.trim(),
        coordinates: { lat: parseFloat(village.lat) || 0, lng: parseFloat(village.lng) || 0 },
      };
      const res = await villageService.create(payload);
      setCreatedVillage(res.data.data);
      toast.success(`Village "${res.data.data.name}" created!`);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create village');
    } finally { setSaving(false); }
  };

  // Step 2 → submit sources
  const handleAddSources = async () => {
    if (!createdVillage) return;
    setSaving(true);
    let added = 0;
    for (const src of sources) {
      if (!src.name.trim()) continue;
      try {
        await sourceService.create({
          name: src.name.trim(),
          type: src.type,
          village: createdVillage._id,
          deviceId: src.deviceId.trim() || undefined,
          location: { lat: parseFloat(src.lat) || 0, lng: parseFloat(src.lng) || 0 },
          installationDate: src.installationDate || undefined,
          status: src.status || 'active',
        });
        added++;
      } catch (err) {
        toast.error(`Source "${src.name}" failed: ${err.response?.data?.message || err.message}`);
      }
    }
    setSaving(false);
    if (added > 0) toast.success(`${added} water source${added > 1 ? 's' : ''} added!`);
    onSuccess(createdVillage);
  };

  const handleSkip = () => onSuccess(createdVillage);

  const inputStyle = { padding: '10px 14px', fontSize: 14 };
  const labelStyle = { fontSize: 12, fontWeight: 600, letterSpacing: 0.3 };
  const sectionHdr = {
    display: 'flex', alignItems: 'center', gap: 8,
    marginBottom: 14, paddingBottom: 10,
    borderBottom: '1px solid var(--color-border)',
    fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620, width: '95%', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <h2 className="modal-title">
              {step === 1 ? '🏘️ Add New Village' : '💧 Add Water Source'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Step {step} of 2 — {step === 1 ? 'Village details' : `Water source for ${createdVillage?.name}`}
            </p>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Step progress bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: s <= step ? 'var(--color-accent)' : 'var(--color-border)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* ════════════ STEP 1 — Village Info ════════════ */}
        {step === 1 && (
          <form onSubmit={handleCreateVillage}>
            <div style={sectionHdr}><MapPin size={16} color="var(--color-accent)" />Village</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={labelStyle}>Village Name *</label>
                <input className="form-input" style={inputStyle} placeholder="e.g. Nagireddypet" value={village.name} onChange={e => setV('name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" style={labelStyle}>District *</label>
                <input className="form-input" style={inputStyle} placeholder="e.g. Medak" value={village.district} onChange={e => setV('district', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" style={labelStyle}>State *</label>
                <input className="form-input" style={inputStyle} placeholder="e.g. Telangana" value={village.state} onChange={e => setV('state', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" style={labelStyle}>Population</label>
                <input className="form-input" style={inputStyle} type="number" placeholder="e.g. 1500" min="0" value={village.population} onChange={e => setV('population', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" style={labelStyle}>Description</label>
                <input className="form-input" style={inputStyle} placeholder="Optional notes" value={village.description} onChange={e => setV('description', e.target.value)} />
              </div>
            </div>

            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={sectionHdr}><Navigation size={15} color="var(--color-accent)" />GPS Location</div>
                <GpsButton onLocate={fetchVillageLocation} fetching={villageGpsFetching} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={labelStyle}>Latitude</label>
                  <input className="form-input" style={inputStyle} placeholder="17.9784" type="number" step="any" value={village.lat} onChange={e => setV('lat', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={labelStyle}>Longitude</label>
                  <input className="form-input" style={inputStyle} placeholder="78.1234" type="number" step="any" value={village.lng} onChange={e => setV('lng', e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Next: Add Water Source →'}</button>
            </div>
          </form>
        )}

        {/* ════════════ STEP 2 — Water Source ════════════ */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              Add a water source for <strong style={{ color: 'var(--color-accent)' }}>{createdVillage?.name}</strong>.
            </p>

            <div style={{ maxHeight: 'calc(92vh - 240px)', overflowY: 'auto', paddingRight: 4 }}>
              {sources.map((src, i) => (
                <div key={i} style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: '16px 18px', marginBottom: 16, border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>
                      <Droplets size={15} color="var(--color-accent)" /> Water Source {sources.length > 1 ? i + 1 : ''}
                    </div>
                    {sources.length > 1 && (
                      <button onClick={() => removeRow(i)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <Trash2 size={13} /> Remove
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label" style={labelStyle}>Source Name *</label>
                      <input className="form-input" style={inputStyle} placeholder={SOURCE_NAME_EXAMPLES[i % SOURCE_NAME_EXAMPLES.length]} value={src.name} onChange={e => setS(i, 'name', e.target.value)} />
                      <div style={{ marginTop: 6, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {SOURCE_NAME_EXAMPLES.map(ex => (
                          <span key={ex} onClick={() => setS(i, 'name', ex)} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'var(--color-border)', cursor: 'pointer', color: src.name === ex ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>{ex}</span>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={labelStyle}>Source Type *</label>
                      <select className="form-select" style={inputStyle} value={src.type} onChange={e => setS(i, 'type', e.target.value)}>
                        {SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={labelStyle}>Device ID (ESP32) *</label>
                      <input className="form-input" style={inputStyle} placeholder="e.g. ESP32-007" value={src.deviceId} onChange={e => setS(i, 'deviceId', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={labelStyle}>Installation Date</label>
                      <input className="form-input" style={inputStyle} type="date" value={src.installationDate} onChange={e => setS(i, 'installationDate', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={labelStyle}>Status</label>
                      <select className="form-select" style={inputStyle} value={src.status} onChange={e => setS(i, 'status', e.target.value)}>
                        {SOURCE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>
                        <Navigation size={14} color="var(--color-accent)" /> GPS Location
                      </div>
                      <GpsButton onLocate={() => fetchSourceLocation(i)} fetching={!!srcGpsFetching[i]} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label" style={labelStyle}>Latitude</label>
                        <input className="form-input" style={inputStyle} placeholder="17.9784" type="number" step="any" value={src.lat} onChange={e => setS(i, 'lat', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={labelStyle}>Longitude</label>
                        <input className="form-input" style={inputStyle} placeholder="78.1234" type="number" step="any" value={src.lng} onChange={e => setS(i, 'lng', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn btn-secondary" style={{ width: '100%', marginBottom: 16, justifyContent: 'center' }} onClick={addRow}>
              <Plus size={14} /> Add Another Water Source
            </button>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
              <button className="btn btn-secondary" onClick={handleSkip}>Skip for now</button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)}><ChevronLeft size={14} /> Back</button>
                <button className="btn btn-primary" disabled={saving} onClick={handleAddSources}>{saving ? 'Saving…' : <><Check size={14} /> Finish & Save</>}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Edit Village Modal ───────────────────────────────────────────────────────
const EditVillageModal = ({ village, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name:        village.name        || '',
    district:    village.district    || '',
    state:       village.state       || '',
    population:  village.population  || '',
    description: village.description || '',
    lat:         village.coordinates?.lat ?? '',
    lng:         village.coordinates?.lng ?? '',
  });
  const [saving, setSaving]           = useState(false);
  const [gpsFetching, setGpsFetching] = useState(false);

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const fetchLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setGpsFetching(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setF('lat', pos.coords.latitude.toFixed(6));
        setF('lng', pos.coords.longitude.toFixed(6));
        setGpsFetching(false);
        toast.success('GPS captured!');
      },
      (err) => { setGpsFetching(false); toast.error(err.message || 'Location denied'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name:        form.name.trim(),
        district:    form.district.trim(),
        state:       form.state.trim(),
        population:  Number(form.population) || 0,
        description: form.description.trim(),
        coordinates: {
          lat: parseFloat(form.lat) || undefined,
          lng: parseFloat(form.lng) || undefined,
        },
      };
      const res = await villageService.update(village._id, payload);
      toast.success(`"${res.data.data.name}" updated!`);
      onSuccess(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update village');
    } finally { setSaving(false); }
  };

  const inputStyle = { padding: '10px 14px', fontSize: 14 };
  const labelStyle = { fontSize: 12, fontWeight: 600, letterSpacing: 0.3 };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580, width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 className="modal-title">✏️ Edit Village</h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>Update details for <strong>{village.name}</strong></p>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--color-border)' }}>
            <MapPin size={15} color="var(--color-accent)" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Village</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label" style={labelStyle}>Village Name *</label>
              <input className="form-input" style={inputStyle} placeholder="e.g. Nagireddypet"
                value={form.name} onChange={e => setF('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" style={labelStyle}>District *</label>
              <input className="form-input" style={inputStyle} placeholder="e.g. Krishna"
                value={form.district} onChange={e => setF('district', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" style={labelStyle}>State *</label>
              <input className="form-input" style={inputStyle} placeholder="e.g. Andhra Pradesh"
                value={form.state} onChange={e => setF('state', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" style={labelStyle}>Population</label>
              <input className="form-input" style={inputStyle} type="number" placeholder="e.g. 1500" min="0"
                value={form.population} onChange={e => setF('population', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" style={labelStyle}>Description</label>
              <input className="form-input" style={inputStyle} placeholder="Optional notes"
                value={form.description} onChange={e => setF('description', e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Navigation size={15} color="var(--color-accent)" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>GPS Location</span>
              </div>
              <GpsButton onLocate={fetchLocation} fetching={gpsFetching} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label" style={labelStyle}>Latitude</label>
                <input className="form-input" style={inputStyle} placeholder="e.g. 16.5062" type="number" step="any"
                  value={form.lat} onChange={e => setF('lat', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" style={labelStyle}>Longitude</label>
                <input className="form-input" style={inputStyle} placeholder="e.g. 80.6480" type="number" step="any"
                  value={form.lng} onChange={e => setF('lng', e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : <><Check size={14} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
const DeleteVillageModal = ({ village, onClose, onConfirm }) => {
  const [deleting, setDeleting] = useState(false);
  const [input, setInput]       = useState('');
  const confirmed = input.trim().toLowerCase() === village.name.trim().toLowerCase();

  const handleDelete = async () => {
    if (!confirmed) return;
    setDeleting(true);
    try {
      await villageService.delete(village._id);
      toast.success(`"${village.name}" deleted.`);
      onConfirm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete village');
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertTriangle size={28} color="var(--color-danger)" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Delete Village</h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            This will permanently delete <strong style={{ color: 'var(--color-text-primary)' }}>{village.name}</strong> and cannot be undone.
            All associated data may be affected.
          </p>
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>
            Type <strong>{village.name}</strong> to confirm
          </label>
          <input
            className="form-input"
            style={{ padding: '10px 14px', borderColor: input && !confirmed ? 'var(--color-danger)' : undefined }}
            placeholder={village.name}
            value={input}
            onChange={e => setInput(e.target.value)}
            autoFocus
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button
            className="btn"
            style={{ flex: 1, background: confirmed ? 'var(--color-danger)' : 'rgba(239,68,68,0.3)', color: confirmed ? '#fff' : 'rgba(255,255,255,0.4)', cursor: confirmed ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
            disabled={!confirmed || deleting}
            onClick={handleDelete}
          >
            {deleting ? 'Deleting…' : <><Trash2 size={14} /> Delete Village</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Villages Page ────────────────────────────────────────────────────────
const VillagesPage = () => {
  const { isAdmin } = useAuth();
  const [villages, setVillages]       = useState([]);
  const [sources, setSources]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [editVillage, setEditVillage] = useState(null);   // village object to edit
  const [deleteVillage, setDeleteVillage] = useState(null); // village object to delete

  const fetchData = () =>
    Promise.all([villageService.getAll(), sourceService.getAll()])
      .then(([vRes, sRes]) => { setVillages(vRes.data.data); setSources(sRes.data.data); })
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => { fetchData(); }, []);

  const getVillageSources = (vid) => sources.filter(s => s.village?._id === vid || s.village === vid);

  const getVillageHealth = (vid) => {
    const vs = getVillageSources(vid);
    if (!vs.length) return 'unknown';
    if (vs.some(s => s.safetyStatus === 'unsafe')) return 'unsafe';
    if (vs.some(s => s.safetyStatus === 'warning')) return 'warning';
    return 'safe';
  };

  const handleAddSuccess = (newVillage) => {
    setShowModal(false);
    toast.success(`✅ "${newVillage.name}" is now on the map!`);
    setLoading(true);
    fetchData();
  };

  const handleEditSuccess = () => {
    setEditVillage(null);
    setLoading(true);
    fetchData();
  };

  const handleDeleteConfirm = () => {
    setDeleteVillage(null);
    setLoading(true);
    fetchData();
  };

  if (loading) return <div className="loader-container"><div className="spinner" /></div>;

  return (
    <div className="animate-fadeIn">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Villages</h1>
          <p className="page-subtitle">{villages.length} village{villages.length !== 1 ? 's' : ''} monitored</p>
        </div>
        {isAdmin && (
          <button id="add-village-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Village
          </button>
        )}
      </div>

      <div className="full-grid stagger-children">
        {villages.map((village) => {
          const vs    = getVillageSources(village._id);
          const health = getVillageHealth(village._id);
          const safeCount = vs.filter(s => s.safetyStatus === 'safe').length;

          return (
            <div key={village._id} className="card animate-fadeInUp village-card">
              <div className="village-card-header">
                <div>
                  <div className="village-name">{village.name}</div>
                  <div className="village-location"><MapPin size={12} /> {village.district}, {village.state}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SafetyBadge status={health} />
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="village-action-btn edit"
                        title="Edit village"
                        onClick={() => setEditVillage(village)}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="village-action-btn delete"
                        title="Delete village"
                        onClick={() => setDeleteVillage(village)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="village-stats">
                <div className="village-stat"><Droplets size={16} color="var(--color-accent)" /><span>{vs.length} Sources</span></div>
                <div className="village-stat"><Users size={16} color="var(--color-text-secondary)" /><span>{village.population?.toLocaleString() || '—'} People</span></div>
              </div>
              {vs.length > 0 ? (
                <div className="source-status-bar">
                  {vs.map(s => <div key={s._id} className={`source-status-chip ${s.safetyStatus || 'unknown'}`} title={s.name} />)}
                  <span className="source-status-text">{safeCount}/{vs.length} safe</span>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: 4 }}>No water sources yet</div>
              )}
              {village.description && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '8px 0 0' }}>{village.description}</p>}
              <Link to={`/villages/${village._id}`} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
                View Sources <ChevronRight size={14} />
              </Link>
            </div>
          );
        })}

        {villages.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
            <Droplets size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>No villages yet</div>
            {isAdmin && <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Add First Village</button>}
          </div>
        )}
      </div>

      {showModal && <AddVillageModal onClose={() => setShowModal(false)} onSuccess={handleAddSuccess} />}
      {editVillage && <EditVillageModal village={editVillage} onClose={() => setEditVillage(null)} onSuccess={handleEditSuccess} />}
      {deleteVillage && <DeleteVillageModal village={deleteVillage} onClose={() => setDeleteVillage(null)} onConfirm={handleDeleteConfirm} />}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .village-action-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--color-border); background: var(--color-bg-secondary); cursor: pointer; transition: all 0.18s; opacity: 0; }
        .village-card:hover .village-action-btn { opacity: 1; }
        .village-action-btn.edit { color: var(--color-accent); }
        .village-action-btn.edit:hover { background: rgba(var(--color-accent-rgb, 0,200,180), 0.15); border-color: var(--color-accent); }
        .village-action-btn.delete { color: var(--color-danger); }
        .village-action-btn.delete:hover { background: rgba(239,68,68,0.15); border-color: var(--color-danger); }
        .village-card { cursor: default; }
        .village-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 8px; }
        .village-name { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
        .village-location { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--color-text-muted); }
        .village-stats { display: flex; gap: 16px; margin-bottom: 16px; }
        .village-stat { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--color-text-secondary); }
        .source-status-bar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .source-status-chip { width: 14px; height: 14px; border-radius: 3px; transition: transform 0.2s; cursor: default; }
        .source-status-chip:hover { transform: scale(1.3); }
        .source-status-chip.safe { background: var(--color-safe); }
        .source-status-chip.warning { background: var(--color-warning); }
        .source-status-chip.unsafe { background: var(--color-danger); }
        .source-status-chip.unknown { background: var(--color-unknown, #8892a4); }
        .source-status-text { font-size: 11px; color: var(--color-text-muted); margin-left: 4px; }
        .full-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
      `}</style>
    </div>
  );
};

export default VillagesPage;
