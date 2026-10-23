import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { mapsAPI, usersAPI, getFileUrl, utilityPointsAPI } from '../api/supabaseApi';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../i18n';
import './MapEditor.css';

const MapEditor = () => {
  const { t } = useLanguage();
  const { id } = useParams();
  const { user } = useAuthStore();
  const [map, setMap] = useState(null);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [showPointForm, setShowPointForm] = useState(false);
  const [editingPoint, setEditingPoint] = useState(null);
  const [selectedPointId, setSelectedPointId] = useState(null);
  const [isPlacingMarker, setIsPlacingMarker] = useState(false);
  const mapImageRef = useRef(null);
  
  const [pointForm, setPointForm] = useState({
    name: '',
    utility_type: 'smoke',
    x: 0,
    y: 0,
    description: '',
    file: null,
  });

  // Couleurs pour chaque type d'utility
  const utilityColors = {
    smoke: '#9B59B6',
    molotov: '#E74C3C',
    flash: '#F39C12',
    grenade: '#E67E22',
    other: '#3498DB',
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if user is admin
        if (user) {
          const profileResponse = await usersAPI.getProfile();
          setIsAdmin(profileResponse.data.role === 'admin');
        }

        const mapResponse = await mapsAPI.getById(id);
        setMap(mapResponse.data.map);
        setPoints(mapResponse.data.points);
      } catch (error) {
        console.error('Error fetching map:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  const handlePointFormChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setPointForm({ ...pointForm, file: files[0] });
    } else {
      setPointForm({ ...pointForm, [name]: value });
    }
  };

  // Gestion du clic sur la carte pour placer un point
  const handleMapClick = (e) => {
    if (!isAdmin) return;

    // Récupérer les coordonnées du clic
    const rect = mapImageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convertir les pixels en pourcentage (0-100)
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    // Si on est en mode placement, mettre à jour les coordonnées et quitter le mode
    if (isPlacingMarker) {
      setPointForm({
        ...pointForm,
        x: Math.round(xPercent),
        y: Math.round(yPercent),
      });
      setIsPlacingMarker(false);
      return;
    }

    // Sinon, créer un nouveau point avec les coordonnées du clic
    setEditingPoint(null);
    setPointForm({
      name: '',
      utility_type: 'smoke',
      x: Math.round(xPercent),
      y: Math.round(yPercent),
      description: '',
      file: null,
    });
    setShowPointForm(true);
  };

  const handleAddPoint = async (e) => {
    e.preventDefault();
    
    try {
      const formData = new FormData();
      formData.append('name', pointForm.name);
      formData.append('utility_type', pointForm.utility_type);
      formData.append('x', pointForm.x);
      formData.append('y', pointForm.y);
      formData.append('description', pointForm.description);
      if (pointForm.file) {
        formData.append('file', pointForm.file);
      }

      const response = await utilityPointsAPI.create(id, formData);

      setPoints([...points, response.data]);
      setPointForm({
        name: '',
        utility_type: 'smoke',
        x: 0,
        y: 0,
        description: '',
        file: null,
      });
      setShowPointForm(false);
    } catch (error) {
      console.error('Error adding point:', error);
      alert(t('addPointError'));
    }
  };

  const handleUpdatePoint = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append('name', pointForm.name);
      formData.append('utility_type', pointForm.utility_type);
      formData.append('x', pointForm.x);
      formData.append('y', pointForm.y);
      formData.append('description', pointForm.description);
      if (pointForm.file) {
        formData.append('file', pointForm.file);
      }

      const response = await utilityPointsAPI.update(editingPoint.id, formData);

      setPoints(points.map(p => p.id === editingPoint.id ? response.data : p));
      setEditingPoint(null);
      setPointForm({
        name: '',
        utility_type: 'smoke',
        x: 0,
        y: 0,
        description: '',
        file: null,
      });
      setShowPointForm(false);
    } catch (error) {
      console.error('Error updating point:', error);
      alert(t('updatePointError'));
    }
  };

  const handleDeletePoint = async (pointId) => {
    if (!window.confirm(t('confirmDeletePoint'))) return;

    try {
      await utilityPointsAPI.delete(pointId);
      setPoints(points.filter(p => p.id !== pointId));
    } catch (error) {
      console.error('Error deleting point:', error);
      alert(t('deletePointError'));
    }
  };

  const handleEditPoint = (point) => {
    setEditingPoint(point);
    setPointForm({
      name: point.name,
      utility_type: point.utility_type,
      x: point.x,
      y: point.y,
      description: point.description,
      file: null,
    });
    setShowPointForm(true);
  };

  if (loading) return <div className="loading">{t('loading')}</div>;
  if (!isAdmin) return <div className="loading">{t('adminRequired')}</div>;

  return (
    <div className="map-editor">
      <h1>{t('editMap')} {map?.name}</h1>
      <p className="editor-hint">
        {isPlacingMarker 
          ? t('clickToPlaceMarker')
          : t('createOrClick')}
      </p>

      <div className="editor-container">
        {/* Section gauche - Carte interactive */}
        <div className="map-section">
          <h2>{t('interactivePlacement')}</h2>
          <div className="map-viewer">
            <div
              className={`map-container ${isPlacingMarker ? 'placing-mode' : ''}`}
              onClick={handleMapClick}
              title={isPlacingMarker ? t('clickToPlaceMarker') : t('createOrClick')}
            >
              <img
                ref={mapImageRef}
                src={getFileUrl(map?.image_url)}
                alt={map?.name}
                className="map-image"
              />
              
              {/* Afficher tous les marqueurs des points */}
              {points.map((point) => (
                <div
                  key={point.id}
                  className={`map-marker ${point.utility_type} ${
                    selectedPointId === point.id ? 'active' : ''
                  }`}
                  style={{
                    left: `${point.x}%`,
                    top: `${point.y}%`,
                    backgroundColor: utilityColors[point.utility_type],
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isPlacingMarker) {
                      setSelectedPointId(point.id);
                      handleEditPoint(point);
                    }
                  }}
                  title={point.name}
                >
                  <span className="marker-label">{point.utility_type[0].toUpperCase()}</span>
                </div>
              ))}

              {/* Marqueur temporaire pendant la création */}
              {showPointForm && !editingPoint && (
                <div
                  className="map-marker preview"
                  style={{
                    left: `${pointForm.x}%`,
                    top: `${pointForm.y}%`,
                    backgroundColor: utilityColors[pointForm.utility_type],
                  }}
                >
                  <span className="marker-label">+</span>
                </div>
              )}
            </div>

            {/* Légende des types */}
            <div className="map-legend">
              <div className="legend-title">{t('legend')}</div>
              {Object.entries(utilityColors).map(([type, color]) => (
                <div key={type} className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: color }}></div>
                  <span>{t(type)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section droite - Formulaire et liste */}
        <div className="points-section">
          <h2>{t('pointDetails')}</h2>

          {showPointForm && (
            <form className="point-form" onSubmit={editingPoint ? handleUpdatePoint : handleAddPoint}>
              <div className="form-group">
                <label>{t('pointName')}</label>
                <input
                  type="text"
                  name="name"
                  placeholder={t('pointNamePlaceholder')}
                  value={pointForm.name}
                  onChange={handlePointFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('utilityTypeLabel')}</label>
                <select
                  name="utility_type"
                  value={pointForm.utility_type}
                  onChange={handlePointFormChange}
                >
                  <option value="smoke">{t('smoke')}</option>
                  <option value="molotov">{t('molotov')}</option>
                  <option value="flash">{t('flash')}</option>
                  <option value="grenade">{t('grenade')}</option>
                  <option value="other">{t('other')}</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('positionX')}</label>
                  <input
                    type="number"
                    name="x"
                    min="0"
                    max="100"
                    value={pointForm.x}
                    onChange={handlePointFormChange}
                  />
                </div>
                <div className="form-group">
                  <label>{t('positionY')}</label>
                  <input
                    type="number"
                    name="y"
                    min="0"
                    max="100"
                    value={pointForm.y}
                    onChange={handlePointFormChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t('description')}</label>
                <textarea
                  name="description"
                  placeholder={t('descriptionPlaceholder')}
                  value={pointForm.description}
                  onChange={handlePointFormChange}
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label>{t('imageVideo')}</label>
                <input
                  type="file"
                  name="file"
                  onChange={handlePointFormChange}
                  accept="image/*,video/*"
                />
                {pointForm.file && <p className="file-name">✓ {pointForm.file.name}</p>}
              </div>

              <div className="form-buttons">
                <button
                  type="button"
                  className="btn-place-marker"
                  onClick={() => setIsPlacingMarker(!isPlacingMarker)}
                >
                  {isPlacingMarker ? t('cancelPlacement') : t('placeMarker')}
                </button>
                <button type="submit" className="btn-submit">
                  {editingPoint ? t('updatePoint') : t('addPoint')}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setShowPointForm(false);
                    setEditingPoint(null);
                    setSelectedPointId(null);
                    setIsPlacingMarker(false);
                  }}
                >
                  {t('close')}
                </button>
              </div>
            </form>
          )}

          {!showPointForm && (
            <button
              className="btn-add-point-large"
              onClick={() => {
                setEditingPoint(null);
                setPointForm({
                  name: '',
                  utility_type: 'smoke',
                  x: 50,
                  y: 50,
                  description: '',
                  file: null,
                });
                setShowPointForm(true);
              }}
            >
              ➕ {t('newPoint')}
            </button>
          )}

          <div className="points-list">
            <h3>{t('existingPoints')} ({points.length})</h3>
            {points.length === 0 ? (
              <p className="empty-state">{t('noPointsCreated')}</p>
            ) : (
              points.map((point) => (
                <div
                  key={point.id}
                  className={`point-item ${selectedPointId === point.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPointId(point.id)}
                >
                  <div className="point-header">
                    <div
                      className="point-type-badge"
                      style={{ backgroundColor: utilityColors[point.utility_type] }}
                    >
                      {point.utility_type}
                    </div>
                    <h3>{point.name}</h3>
                    <span className="point-coords">({point.x}%, {point.y}%)</span>
                  </div>
                  <p className="point-description">{point.description}</p>
                  <div className="point-actions">
                    <button
                      className="btn-edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPoint(point);
                      }}
                    >
                      ✏️ {t('edit')}
                    </button>
                    <button
                      className="btn-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePoint(point.id);
                      }}
                    >
                      🗑️ {t('delete')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapEditor;
