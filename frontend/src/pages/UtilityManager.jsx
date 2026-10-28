import React, { useState, useEffect, useRef, useCallback } from 'react';
import { mapsAPI, getFileUrl, utilityPointsAPI } from '../api/supabaseApi';
import { useAuthStore } from '../store/authStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../i18n';
import './UtilityManager.css';

const initialUtilityFilters = {
  smoke: true,
  flash: false,
  molotov: false,
  grenade: false,
};

const getUtilityManagerPreferences = (mapId) => {
  const savedPreferences = localStorage.getItem(`nexastrike-utility-manager-preferences-${mapId}`);
  if (!savedPreferences) {
    return { utilityFilters: initialUtilityFilters, selectedTeam: 'all' };
  }

  let preferences;
  try {
    preferences = JSON.parse(savedPreferences);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { utilityFilters: initialUtilityFilters, selectedTeam: 'all' };
    }
    throw error;
  }

  const savedFilters = preferences?.utilityFilters;
  return {
    utilityFilters: Object.fromEntries(
      Object.keys(initialUtilityFilters).map((type) => [
        type,
        typeof savedFilters?.[type] === 'boolean' ? savedFilters[type] : initialUtilityFilters[type],
      ]),
    ),
    selectedTeam: ['all', 'ct', 't'].includes(preferences?.selectedTeam) ? preferences.selectedTeam : 'all',
  };
};

const UtilityManager = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const mapQueryId = searchParams.get('map');
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [mapDetails, setMapDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isPlacingMarker, setIsPlacingMarker] = useState(false);
  const [isPlacingLine, setIsPlacingLine] = useState(false);
  const [isPlacingLineGroup, setIsPlacingLineGroup] = useState(false);
  const [selectedParentZone, setSelectedParentZone] = useState(null);
  const [selectedLineGroup, setSelectedLineGroup] = useState(null);
  const [utilityFilters, setUtilityFilters] = useState(() => getUtilityManagerPreferences(mapQueryId).utilityFilters);
  const [activePlacementType, setActivePlacementType] = useState('smoke');
  const [selectedPlacementTeam, setSelectedPlacementTeam] = useState('t');
  const [showZoneTypeDropdown, setShowZoneTypeDropdown] = useState(false);
  const [editingPointId, setEditingPointId] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(() => getUtilityManagerPreferences(mapQueryId).selectedTeam);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const mapImageRef = useRef(null);
  const mapStageRef = useRef(null);
  const zoomRef = useRef(100);
  const panRef = useRef({ x: 0, y: 0 });
  const didDragMapRef = useRef(false);
  const loadedPreferencesMapId = useRef(mapQueryId);
  const skipPreferenceSave = useRef(false);

  useEffect(() => {
    if (loadedPreferencesMapId.current === mapQueryId) return;

    const savedPreferences = getUtilityManagerPreferences(mapQueryId);
    setUtilityFilters(savedPreferences.utilityFilters);
    setSelectedTeam(savedPreferences.selectedTeam);
    loadedPreferencesMapId.current = mapQueryId;
    skipPreferenceSave.current = true;
  }, [mapQueryId]);

  useEffect(() => {
    if (!mapQueryId) return;
    if (skipPreferenceSave.current) {
      skipPreferenceSave.current = false;
      return;
    }

    localStorage.setItem(
      `nexastrike-utility-manager-preferences-${mapQueryId}`,
      JSON.stringify({ utilityFilters, selectedTeam }),
    );
  }, [mapQueryId, utilityFilters, selectedTeam]);

  const createEmptyPointForm = (utilityType = 'smoke') => ({
    name: '',
    utility_type: utilityType,
    x: 0,
    y: 0,
    description: '',
    suggested_by: '',
    jump_throw: 'no',
    movement: 'standing',
    mouse_button: 'left_click',
    difficulty: 'medium',
    team: 't',
    parent_id: null,
    file: null,
    video_url: '',
  });

  const parsePointMetadata = (description = '') => {
    const parts = String(description)
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);

    const metadata = {
      description: '',
      jump_throw: 'no',
      movement: 'standing',
      mouse_button: 'left_click',
      difficulty: 'medium',
      parent_id: null,
    };

    const otherParts = [];

    parts.forEach((part) => {
      const [keyRaw, ...rest] = part.split(':');
      const key = String(keyRaw || '').trim().toLowerCase().replace(/\s+/g, '_');
      const value = rest.join(':').trim();

      if (key === 'jump_throw') metadata.jump_throw = value || 'yes';
      else if (key === 'movement') metadata.movement = value || 'standing';
      else if (key === 'mouse_button') metadata.mouse_button = value || 'left_click';
      else if (key === 'difficulty') metadata.difficulty = value || 'medium';
      else if (key === 'parent') metadata.parent_id = value ? Number(value) : null;
      else otherParts.push(part);
    });

    metadata.description = otherParts.join(' | ').trim();
    return metadata;
  };

  const getParentIdFromPoint = (point) => {
    if (!point) return null;
    if (point.parent_id != null) return Number(point.parent_id);
    if (!point.description) return null;
    const match = String(point.description).match(/parent:(\d+)/i);
    return match ? Number(match[1]) : null;
  };

  const getPointPosition = (point) => {
    if (point.utility_type !== 'line_group') {
      const parent = mapDetails?.utility_points.find((candidate) => candidate.id === getParentIdFromPoint(point));
      if (parent?.utility_type === 'line_group') return parent;
    }

    return point;
  };

  const getGroupChildOffset = (point) => {
    if (!selectedLineGroup || !isGroupChild(point, selectedLineGroup)) return { x: 0, y: 0 };
    const groupChildren = mapDetails.utility_points.filter((candidate) => isGroupChild(candidate, selectedLineGroup));
    const childIndex = groupChildren.findIndex((child) => child.id === point.id);
    return {
      x: (childIndex - (groupChildren.length - 1) / 2) * 30,
      y: -32,
    };
  };

  const isLineRelatedToParent = (linePoint, parentZone) => {
    if (!linePoint || !parentZone) return false;
    return getParentIdFromPoint(linePoint) === parentZone.id;
  };

  const isGroupChild = (point, group) => (
    point
    && group
    && point.id !== group.id
    && point.utility_type !== 'line_group'
    && getParentIdFromPoint(point) === group.id
  );

  const isPointVisible = (point) => {
    if (selectedTeam !== 'all' && normalizeTeam(point.team) !== selectedTeam) return false;

    if (isPlacingLineGroup) {
      return point.utility_type !== 'line' && point.utility_type !== 'line_group';
    }

    if (isPlacingLine) {
      if (selectedLineGroup) {
        return point.id === selectedLineGroup.id
          || (selectedParentZone && point.id === selectedParentZone.id)
          || isGroupChild(point, selectedLineGroup);
      }

      return selectedParentZone && (
        point.id === selectedParentZone.id
        || (point.utility_type === 'line' && isLineRelatedToParent(point, selectedParentZone))
      );
    }

    if (selectedParentZone) {
      if (point.id === selectedParentZone.id) return true;
      if (point.utility_type === 'line_group') {
        return getParentIdFromPoint(point) === selectedParentZone.id;
      }
      if (selectedLineGroup && (point.id === selectedLineGroup.id || isGroupChild(point, selectedLineGroup))) {
        return true;
      }
      if (point.utility_type === 'line') {
        return selectedLineGroup
          ? isGroupChild(point, selectedLineGroup)
          : isLineRelatedToParent(point, selectedParentZone);
      }
      return false;
    }

    if (selectedLineGroup && (point.id === selectedLineGroup.id || isGroupChild(point, selectedLineGroup))) {
      return true;
    }

    if (point.utility_type === 'line') {
      return (selectedLineGroup && isLineRelatedToParent(point, selectedLineGroup))
        || (selectedParentZone && isLineRelatedToParent(point, selectedParentZone));
    }

    if (point.utility_type === 'line_group') return selectedParentZone && getParentIdFromPoint(point) === selectedParentZone.id;
    if (selectedParentZone && point.id === selectedParentZone.id) return true;
    return utilityFilters[point.utility_type] !== false;
  };

  const mapConnectors = selectedParentZone
    ? [
      ...(mapDetails?.utility_points || [])
        .filter((point) => point.utility_type === 'line' && isLineRelatedToParent(point, selectedParentZone))
        .map((point) => ({ point, parent: selectedParentZone })),
      ...(mapDetails?.utility_points || [])
        .filter((point) => point.utility_type === 'line_group' && getParentIdFromPoint(point) === selectedParentZone.id)
        .map((point) => ({ point, parent: selectedParentZone })),
    ]
    : [];

  const [pointForm, setPointForm] = useState(createEmptyPointForm());

  // Couleurs pour chaque type d'utility
  const utilityColors = {
    smoke: '#9B59B6',
    molotov: '#E74C3C',
    flash: '#F39C12',
    grenade: '#E67E22',
    line_group: '#00D4FF',
  };

  const normalizeTeam = (team) => {
    const normalized = String(team || '').toLowerCase();
    return normalized === 'ct' ? 'ct' : 't';
  };

  const getTeamLabel = (team) => {
    const normalized = String(team || '').toLowerCase();
    if (normalized === 'ct') return 'CT';
    if (normalized === 't') return 'T';
    return 'ALL';
  };

  const getMarkerIconName = (point) => {
    const rawType = String(point.utility_type || '').toLowerCase();
    const validTypes = ['smoke', 'flash', 'molotov', 'grenade'];
    const type = validTypes.includes(rawType) ? rawType : 'smoke';
    const prefix = normalizeTeam(point.team) === 'ct' ? 'CT' : 'T';
    const iconName = `${prefix}_${type}.png`;

    return `/icon/${iconName}`;
  };

  const fetchMapDetails = useCallback(async (mapId) => {
    try {
      const response = await mapsAPI.getById(mapId);
      setMapDetails(response.data);
    } catch (error) {
      console.error('Error fetching map details:', error);
    }
  }, []);

  const orderMaps = (mapsList) => {
    const mapPool = ['ancient', 'anubis', 'dust ii', 'inferno', 'cache', 'nuke', 'mirage'];
    const ancientSeasonMapNames = ['stronghold', 'warden', 'alpine', 'sanctum wingman'];
    const wingmanMapNames = ['el dorado wingman', 'debris wingman'];

    const normalizedName = (name) => String(name || '').toLowerCase();
    const normalizedCategory = (cat) => String(cat || '').toLowerCase();

    const officialMaps = mapsList.filter((map) => mapPool.includes(normalizedName(map.name)));
    const premierMaps = mapsList.filter((map) => {
      const name = normalizedName(map.name);
      const cat = normalizedCategory(map.category);
      const isPremierCategory = !map.category || ['premier mod', 'mode competitive', 'competitive mode'].includes(cat);
      return !mapPool.includes(name) && !ancientSeasonMapNames.includes(name) && !wingmanMapNames.includes(name) && isPremierCategory;
    });
    const wingmanMaps = mapsList.filter((map) => (normalizedCategory(map.category) === 'wingman' || wingmanMapNames.includes(normalizedName(map.name))) && !ancientSeasonMapNames.includes(normalizedName(map.name)));
    const ancientSeasonMaps = mapsList.filter((map) => ancientSeasonMapNames.includes(normalizedName(map.name)) || normalizedCategory(map.category) === 'map des ancien saison');
    const comingSoonMaps = mapsList.filter((map) => normalizedCategory(map.category) === 'à venir' || normalizedCategory(map.category) === 'coming soon');

    const uniqueOrdered = [...officialMaps, ...premierMaps, ...wingmanMaps, ...ancientSeasonMaps, ...comingSoonMaps];
    const seen = new Set();
    return uniqueOrdered.filter((map) => {
      if (seen.has(map.id)) return false;
      seen.add(map.id);
      return true;
    });
  };

  const fetchMaps = useCallback(async () => {
    try {
      const response = await mapsAPI.getAll();
      const orderedMaps = orderMaps(response.data);
      setMaps(orderedMaps);
    } catch (error) {
      console.error('Error fetching maps:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if user is admin
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    fetchMaps();
  }, [user?.id, user?.role, navigate, fetchMaps]);

  useEffect(() => {
    if (maps.length === 0) return;

    const requestedMap = maps.find((map) => String(map.id) === mapQueryId);
    if (!requestedMap) {
      const params = new URLSearchParams(searchParams);
      params.set('map', String(maps[0].id));
      setSearchParams(params, { replace: true });
      return;
    }

    setSelectedMap(requestedMap.id);
    setSelectedParentZone(null);
    setSelectedLineGroup(null);
    fetchMapDetails(requestedMap.id);
  }, [maps, mapQueryId, searchParams, setSearchParams, fetchMapDetails]);

  const handleMapChange = (mapId) => {
    setSelectedMap(mapId);
    setSelectedParentZone(null);
    setSelectedLineGroup(null);
    setShowForm(false);
    setIsPlacingLine(false);
    setIsPlacingLineGroup(false);
    setIsPlacingMarker(false);
    resetMapView();
    const params = new URLSearchParams(searchParams);
    params.set('map', String(mapId));
    setSearchParams(params);
  };

  const resetMapView = () => {
    setZoom(100);
    zoomRef.current = 100;
    setRotation(0);
    setPanX(0);
    setPanY(0);
    panRef.current = { x: 0, y: 0 };
  };

  const handleMapMouseDown = (event) => {
    if (
      event.button !== 0
      || isPlacingMarker
      || isPlacingLine
      || isPlacingLineGroup
      || event.target.closest('.utility-map-marker')
    ) return;

    event.preventDefault();
    didDragMapRef.current = false;
    setIsDragging(true);
    setDragStart({
      x: event.clientX - panRef.current.x,
      y: event.clientY - panRef.current.y,
    });
  };

  useEffect(() => {
    if (!isDragging) return undefined;

    const handleMouseMove = (event) => {
      const nextPan = {
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y,
      };
      didDragMapRef.current = true;
      setPanX(nextPan.x);
      setPanY(nextPan.y);
      panRef.current = nextPan;
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const handleMapWheel = (event) => {
    if (event.deltaY === 0) return;
    event.preventDefault();
    const stage = mapStageRef.current;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    const mouseX = event.clientX - rect.left - stage.clientLeft - width / 2;
    const mouseY = event.clientY - rect.top - stage.clientTop - height / 2;
    const previousScale = zoomRef.current / 100;
    const nextZoom = Math.min(Math.max(zoomRef.current + (event.deltaY < 0 ? 10 : -10), 50), 200);
    const nextScale = nextZoom / 100;
    const radians = (rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const unrotatedX = cos * (mouseX - panRef.current.x) + sin * (mouseY - panRef.current.y);
    const unrotatedY = -sin * (mouseX - panRef.current.x) + cos * (mouseY - panRef.current.y);
    const scaleRatio = nextScale / previousScale;
    const nextPan = {
      x: mouseX - (cos * unrotatedX * scaleRatio) + (sin * unrotatedY * scaleRatio),
      y: mouseY - (sin * unrotatedX * scaleRatio) - (cos * unrotatedY * scaleRatio),
    };

    setZoom(nextZoom);
    zoomRef.current = nextZoom;
    setPanX(nextPan.x);
    setPanY(nextPan.y);
    panRef.current = nextPan;
  };

  useEffect(() => {
    const stage = mapStageRef.current;
    if (!stage) return undefined;

    stage.addEventListener('wheel', handleMapWheel, { passive: false });
    return () => stage.removeEventListener('wheel', handleMapWheel);
  }, [mapDetails, rotation]);

  const handleFormChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setPointForm({ ...pointForm, file: files[0] });
    } else {
      setPointForm({ ...pointForm, [name]: value });
    }
  };

  const buildPointDescription = () => {
    const baseDescription = String(pointForm.description || '').trim();
    if (pointForm.utility_type !== 'line' && pointForm.utility_type !== 'line_group') {
      return baseDescription;
    }

    const parts = [];
    if (pointForm.parent_id) parts.push(`parent:${pointForm.parent_id}`);
    if (baseDescription) parts.push(baseDescription);
    if (pointForm.utility_type === 'line') {
      parts.push(`jump_throw:${pointForm.jump_throw}`);
      parts.push(`movement:${pointForm.movement}`);
      parts.push(`mouse_button:${pointForm.mouse_button}`);
      parts.push(`difficulty:${pointForm.difficulty}`);
    }
    return parts.join(' | ');
  };

  const resetEditForm = (utilityType = 'smoke', keepGroupSelection = false) => {
    setEditingPointId(null);
    setPointForm(createEmptyPointForm(utilityType));
    setShowForm(false);
    if (!keepGroupSelection) {
      setSelectedParentZone(null);
      setSelectedLineGroup(null);
    }
  };

  const handleAddPoint = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      const descriptionValue = buildPointDescription();

      formData.append('name', pointForm.name);
      formData.append('utility_type', pointForm.utility_type);
      formData.append('x', pointForm.x);
      formData.append('y', pointForm.y);
      formData.append('description', descriptionValue);
      formData.append('suggested_by', pointForm.suggested_by.trim());
      if (pointForm.file) {
        formData.append('file', pointForm.file);
      } else if (pointForm.video_url) {
        formData.append('video_url', pointForm.video_url.trim());
      }
      formData.append('team', pointForm.team || 't');

      if (editingPointId) {
        await utilityPointsAPI.update(editingPointId, formData);
      } else {
        await utilityPointsAPI.create(selectedMap, formData);
      }

      resetEditForm(pointForm.utility_type, pointForm.utility_type === 'line' && Boolean(selectedLineGroup));
      fetchMapDetails(selectedMap);
    } catch (error) {
      console.error('Error adding point:', error);
      alert(t('addPointError'));
    }
  };

  const handleDeletePoint = async (pointId) => {
    if (!window.confirm(t('confirmDeletePoint'))) return;

    try {
      await utilityPointsAPI.delete(pointId);
      fetchMapDetails(selectedMap);
    } catch (error) {
      console.error('Error deleting point:', error);
      alert(t('deletePointError'));
    }
  };

  const startEditingPoint = (point) => {
    const metadata = parsePointMetadata(point.description || '');
    const parentPoint = mapDetails.utility_points.find((candidate) => candidate.id === metadata.parent_id);
    const parentGroup = parentPoint?.utility_type === 'line_group' ? parentPoint : null;
    const position = parentGroup || point;
    setEditingPointId(point.id);
    setPointForm({
      name: point.name || '',
      utility_type: point.utility_type || 'smoke',
      x: position.x || 0,
      y: position.y || 0,
      description: metadata.description,
      suggested_by: point.suggested_by || '',
      jump_throw: metadata.jump_throw || 'no',
      movement: metadata.movement || 'standing',
      mouse_button: metadata.mouse_button || 'left_click',
      difficulty: metadata.difficulty || 'medium',
      parent_id: metadata.parent_id || null,
      team: point.team || 't',
      file: null,
      video_url: point.video_url || '',
    });
    setShowForm(true);
    setIsPlacingMarker(false);
    setIsPlacingLine(false);
    setIsPlacingLineGroup(false);
    setSelectedLineGroup(parentGroup);
    setSelectedParentZone(parentGroup
      ? mapDetails.utility_points.find((candidate) => candidate.id === getParentIdFromPoint(parentGroup)) || null
      : null);
  };

  const startAddingLineToGroup = (group) => {
    setEditingPointId(null);
    setPointForm({
      ...createEmptyPointForm('line'),
      x: group.x,
      y: group.y,
      parent_id: group.id,
      team: group.team || 't',
    });
    setIsPlacingLine(false);
    setShowForm(true);
  };

  // Gestionnaire pour placer les marqueurs sur la map
  const handleMapClick = async (e) => {
    if (didDragMapRef.current) {
      didDragMapRef.current = false;
      return;
    }

    if (!isPlacingMarker && !isPlacingLine && !isPlacingLineGroup) {
      setSelectedParentZone(null);
      setSelectedLineGroup(null);
      return;
    }

    if (
      !mapImageRef.current
      || !mapStageRef.current
      || !mapImageRef.current.offsetWidth
      || !mapImageRef.current.offsetHeight
    ) return;
    const stage = mapStageRef.current;
    const rect = stage.getBoundingClientRect();
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    const localX = e.clientX - rect.left - stage.clientLeft - width / 2 - panX;
    const localY = e.clientY - rect.top - stage.clientTop - height / 2 - panY;
    const radians = (rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const scale = zoom / 100;
    const x = (cos * localX + sin * localY) / scale + width / 2;
    const y = (-sin * localX + cos * localY) / scale + height / 2;
    const pointX = Math.round((x / mapImageRef.current.offsetWidth) * 100);
    const pointY = Math.round((y / mapImageRef.current.offsetHeight) * 100);

    // Place zone: create immediately a smoke point on click
    if (isPlacingMarker) {
      try {
        const formData = new FormData();
        formData.append('name', `${activePlacementType.charAt(0).toUpperCase() + activePlacementType.slice(1)} (auto)`);
        formData.append('utility_type', activePlacementType);
        formData.append('x', Math.min(100, Math.max(0, pointX)));
        formData.append('y', Math.min(100, Math.max(0, pointY)));
        const description = selectedLineGroup
          ? `parent:${selectedLineGroup.id}`
          : 'Placed via Place zone';
        formData.append('description', description);
        formData.append('team', normalizeTeam(selectedLineGroup?.team || selectedPlacementTeam));

        await utilityPointsAPI.create(selectedMap, formData);
        setIsPlacingMarker(false);
        // refresh points
        fetchMapDetails(selectedMap);
      } catch (err) {
        console.error('Error creating smoke:', err);
        alert(t('addPointError'));
      }

      return;
    }

    if (isPlacingLineGroup) {
      if (!selectedParentZone) return;

      setPointForm({
        ...createEmptyPointForm('line_group'),
        x: Math.min(100, Math.max(0, pointX)),
        y: Math.min(100, Math.max(0, pointY)),
        parent_id: selectedParentZone.id,
        team: selectedParentZone.team || 't',
      });
      setIsPlacingLineGroup(false);
      setShowForm(true);
      return;
    }

    // Place line: must have a selected parent zone first
    if (isPlacingLine) {
      const lineParent = selectedLineGroup || selectedParentZone;
      if (!lineParent) return;

      // prepare form for a line point linked to parent via description
      setPointForm({
        ...createEmptyPointForm('line'),
        x: Math.min(100, Math.max(0, pointX)),
        y: Math.min(100, Math.max(0, pointY)),
        parent_id: lineParent.id,
        team: lineParent.team || 't',
        description: '',
      });

      // open the form to let user fill details before saving
      setIsPlacingLine(false);
      setShowForm(true);
      return;
    }
  };

  if (loading) return <div className="loading">{t('loading')}</div>;

  return (
    <div className="utility-manager">
      <h1>⚙️ {t('utilityManagerTitle')}</h1>

      <div className="manager-container">
        <div className="map-selector">
          <label htmlFor="mapSelect">{t('selectMapLabel')}:</label>
          <select
            id="mapSelect"
            value={selectedMap || ''}
            onChange={(e) => handleMapChange(parseInt(e.target.value))}
          >
            {maps.map((map) => (
              <option key={map.id} value={map.id}>
                {map.name}
              </option>
            ))}
          </select>
        </div>

        {mapDetails && (
          <div className="manager-content">
            <div className="editor-container">
              {/* Formulaire et Map côte à côte */}
              <div className="editor-map-section">
                {/* Formulaire */}
                <div className="form-section">
                  <div className="form-header">
                    <h3>{showForm ? t('addEditPoint') : t('pointDetailsTitle')}</h3>
                  </div>

                  {showForm ? (
                    <form className="point-form" onSubmit={handleAddPoint}>
                      <div className="form-group">
                        <label>{t('nameLabel')} *</label>
                        <input
                          type="text"
                          name="name"
                          value={pointForm.name}
                          onChange={handleFormChange}
                          required
                          placeholder={t('pointNamePlaceholder')}
                        />
                      </div>

                      {pointForm.utility_type === 'line' || pointForm.utility_type === 'line_group' ? (
                        <div className="form-group">
                          <label>{t('typeLabel')}</label>
                          <div className="utility-type-static">
                            {t(pointForm.utility_type === 'line_group' ? 'lineGroup' : 'line')}
                          </div>
                        </div>
                      ) : (
                        <div className="form-group">
                          <label>{t('typeLabel')} *</label>
                          <select
                            name="utility_type"
                            value={pointForm.utility_type}
                            onChange={handleFormChange}
                          >
                            <option value="smoke">{t('smoke')}</option>
                            <option value="flash">{t('flash')}</option>
                            <option value="molotov">{t('molotov')}</option>
                            <option value="grenade">{t('grenade')}</option>
                          </select>
                        </div>
                      )}

                      <div className="form-group">
                        <label>{t('team')}</label>
                        <select
                          name="team"
                          value={pointForm.team}
                          onChange={handleFormChange}
                        >
                          <option value="t">T</option>
                          <option value="ct">CT</option>
                        </select>
                      </div>

                      {pointForm.utility_type === 'line'
                        && mapDetails.utility_points.some((point) => (
                          point.id === pointForm.parent_id && point.utility_type === 'line_group'
                        )) ? (
                          <div className="form-group">
                            <label>{t('lineGroup')}</label>
                            <div className="utility-type-static">{t('sharedLineGroupPosition')}</div>
                          </div>
                        ) : (
                          <>
                            <div className="form-group">
                              <label>{t('xCoordinate')}: {pointForm.x}%</label>
                              <input
                                type="range"
                                name="x"
                                value={pointForm.x}
                                onChange={handleFormChange}
                                min="0"
                                max="100"
                                className="slider"
                              />
                            </div>

                            <div className="form-group">
                              <label>{t('yCoordinate')}: {pointForm.y}%</label>
                              <input
                                type="range"
                                name="y"
                                value={pointForm.y}
                                onChange={handleFormChange}
                                min="0"
                                max="100"
                                className="slider"
                              />
                            </div>
                          </>
                        )}

                      {pointForm.utility_type === 'line' && (
                        <>
                          <div className="form-group">
                            <label>{t('jumpThrow')}</label>
                            <select name="jump_throw" value={pointForm.jump_throw} onChange={handleFormChange}>
                              <option value="yes">{t('jumpThrowYes')}</option>
                              <option value="no">{t('jumpThrowNo')}</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label>{t('movement')}</label>
                            <select name="movement" value={pointForm.movement} onChange={handleFormChange}>
                              <option value="crouching">{t('movementCrouching')}</option>
                              <option value="standing">{t('movementStanding')}</option>
                              <option value="walking_one_step">{t('movementWalkingOneStep')}</option>
                              <option value="walking_two_step">{t('movementWalkingTwoSteps')}</option>
                              <option value="running_one_step">{t('movementRunningOneStep')}</option>
                              <option value="running_two_step">{t('movementRunningTwoSteps')}</option>
                              <option value="other">{t('other')}</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label>{t('mouseButton')}</label>
                            <select name="mouse_button" value={pointForm.mouse_button} onChange={handleFormChange}>
                              <option value="left_click">{t('leftClick')}</option>
                              <option value="right_click">{t('rightClick')}</option>
                              <option value="left_right_click">{t('leftAndRightClick')}</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label>{t('difficultyLevel')}</label>
                            <select name="difficulty" value={pointForm.difficulty} onChange={handleFormChange}>
                              <option value="easy">{t('difficultyEasy')}</option>
                              <option value="medium">{t('difficultyMedium')}</option>
                              <option value="hard">{t('difficultyHard')}</option>
                            </select>
                          </div>
                        </>
                      )}

                      <div className="form-group">
                        <label>{t('descriptionLabel')}</label>
                        <textarea
                          name="description"
                          value={pointForm.description}
                          onChange={handleFormChange}
                          placeholder={t('descriptionPlaceholder')}
                          rows="3"
                        />
                      </div>

                      <div className="form-group">
                        <label>{t('suggestedByLabel')}</label>
                        <input
                          type="text"
                          name="suggested_by"
                          value={pointForm.suggested_by}
                          onChange={handleFormChange}
                          placeholder={t('suggestedByPlaceholder')}
                        />
                      </div>

                      {pointForm.utility_type === 'line' && (
                        <div className="form-group">
                          <label>{t('videoUrl')}</label>
                          <input
                            type="url"
                            name="video_url"
                            value={pointForm.video_url}
                            onChange={handleFormChange}
                            placeholder="https://example.com/video.mp4"
                          />
                          <small>{t('lineVideoHelp')}</small>
                        </div>
                      )}

                      <div className="form-group">
                        <label>{t('imageVideoLabel')}</label>
                        <input
                          type="file"
                          name="file"
                          onChange={handleFormChange}
                          accept="image/*,video/*"
                        />
                      </div>

                      <div className="form-actions">
                        <button type="submit" className="btn-submit">
                          ✓ {t('savePoint')}
                        </button>
                        <button
                          type="button"
                          className="btn-cancel"
                          onClick={() => {
                            setShowForm(false);
                            setIsPlacingMarker(false);
                            setIsPlacingLine(false);
                            setIsPlacingLineGroup(false);
                          }}
                        >
                          ✕ {t('cancel')}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="action-buttons">
                      <div className="placement-controls">
                        <button
                          type="button"
                          className={`btn-place-line ${isPlacingLineGroup ? 'active' : ''}`}
                          onClick={() => {
                            if (isPlacingLineGroup) {
                              setIsPlacingLineGroup(false);
                              setSelectedParentZone(null);
                            } else {
                              setShowForm(false);
                              setEditingPointId(null);
                              setSelectedParentZone(null);
                              setSelectedLineGroup(null);
                              setIsPlacingLineGroup(true);
                              setIsPlacingLine(false);
                              setIsPlacingMarker(false);
                              setShowZoneTypeDropdown(false);
                            }
                          }}
                        >
                          {t('addLineGroupAction')}
                        </button>

                        <button
                          className={`btn-place-marker ${isPlacingMarker ? 'active' : ''}`}
                          onClick={() => {
                            if (isPlacingMarker) {
                              setIsPlacingMarker(false);
                              setShowZoneTypeDropdown(false);
                            } else {
                              setShowForm(false);
                              setShowZoneTypeDropdown((s) => !s);
                              setIsPlacingLine(false);
                              setIsPlacingLineGroup(false);
                            }
                          }}
                        >
                          📍 {t('placeMarkerAction')}
                        </button>

                        <div className="team-picker">
                          <button
                            type="button"
                            className={`team-pill ${selectedPlacementTeam === 't' ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedPlacementTeam('t');
                              setPointForm((prev) => ({ ...prev, team: 't' }));
                            }}
                          >
                            T
                          </button>
                          <button
                            type="button"
                            className={`team-pill ${selectedPlacementTeam === 'ct' ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedPlacementTeam('ct');
                              setPointForm((prev) => ({ ...prev, team: 'ct' }));
                            }}
                          >
                            CT
                          </button>
                        </div>

                        {showZoneTypeDropdown && (
                          <div className="zone-dropdown">
                            <div className="zone-option" onClick={() => {
                              setActivePlacementType('smoke');
                            setPointForm({ ...createEmptyPointForm('smoke'), team: normalizeTeam(selectedLineGroup?.team || selectedPlacementTeam) });
                              setIsPlacingMarker(true);
                              setShowZoneTypeDropdown(false);
                            }}>💨 {t('smoke')}</div>
                            <div className="zone-option" onClick={() => {
                              setActivePlacementType('flash');
                            setPointForm({ ...createEmptyPointForm('flash'), team: normalizeTeam(selectedLineGroup?.team || selectedPlacementTeam) });
                              setIsPlacingMarker(true);
                              setShowZoneTypeDropdown(false);
                            }}>⚡ {t('flash')}</div>
                            <div className="zone-option" onClick={() => {
                              setActivePlacementType('molotov');
                            setPointForm({ ...createEmptyPointForm('molotov'), team: normalizeTeam(selectedLineGroup?.team || selectedPlacementTeam) });
                              setIsPlacingMarker(true);
                              setShowZoneTypeDropdown(false);
                            }}>🔥 {t('molotov')}</div>
                            <div className="zone-option" onClick={() => {
                              setActivePlacementType('grenade');
                            setPointForm({ ...createEmptyPointForm('grenade'), team: normalizeTeam(selectedLineGroup?.team || selectedPlacementTeam) });
                              setIsPlacingMarker(true);
                              setShowZoneTypeDropdown(false);
                            }}>💥 {t('grenade')}</div>
                            <div className="zone-option cancel" onClick={() => setShowZoneTypeDropdown(false)}>✕ {t('cancel')}</div>
                          </div>
                        )}

                      <button
                        className={`btn-place-line ${isPlacingLine ? 'active' : ''}`}
                        onClick={() => {
                          if (isPlacingLine) {
                            setIsPlacingLine(false);
                          } else if (selectedLineGroup) {
                            startAddingLineToGroup(selectedLineGroup);
                          } else {
                            setShowForm(false);
                            setEditingPointId(null);
                            setPointForm(createEmptyPointForm('smoke'));
                            setIsPlacingLine(true);
                            setIsPlacingLineGroup(false);
                            setIsPlacingMarker(false);
                            setShowZoneTypeDropdown(false);
                          }
                        }}
                      >
                        <span className="line-btn-label">─</span> {selectedLineGroup ? t('addLineToGroupAction') : t('placeLineAction')}
                      </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Map */}
                <div className="map-section">
                  <div className="utility-filter-bar">
                    <div className="utility-map-filters">
                      {[
                        ['smoke', '💨'],
                        ['flash', '⚡'],
                        ['molotov', '🔥'],
                        ['grenade', '💥'],
                      ].map(([type, icon]) => (
                        <button
                          key={type}
                          className={`filter-btn ${utilityFilters[type] ? 'active' : ''}`}
                          onClick={() => setUtilityFilters((previous) => ({
                            ...previous,
                            [type]: !previous[type],
                          }))}
                        >
                          {icon} {t(type)}
                          <span className="filter-count">
                            {mapDetails.utility_points.filter((point) => point.utility_type === type).length}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="utility-team-filters">
                      {['all', 'ct', 't'].map((team) => (
                        <button
                          key={team}
                          className={`filter-btn team-filter-btn ${selectedTeam === team ? 'active' : ''}`}
                          onClick={() => setSelectedTeam(team)}
                        >
                          {team === 'all' ? t('allTeams') : team.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    {isPlacingLineGroup && selectedParentZone && <span className="parent-indicator">{t('parentZone')}: {selectedParentZone.name}</span>}
                    {isPlacingLine && (selectedLineGroup || selectedParentZone) && (
                      <span className="parent-indicator">
                        {t(selectedLineGroup ? 'lineGroup' : 'parentZone')}: {(selectedLineGroup || selectedParentZone).name}
                      </span>
                    )}
                  </div>
                  <div className="map-toolbar">
                    <div className="toolbar-group">
                      <button className="toolbar-btn" onClick={() => setRotation((prev) => prev - 90)} title={t('rotateLeft')} aria-label={t('rotateLeft')}>↺</button>
                      <button className="toolbar-btn" onClick={() => setRotation((prev) => prev + 90)} title={t('rotateRight')} aria-label={t('rotateRight')}>↻</button>
                    </div>
                    <div className="toolbar-group">
                      <button className="toolbar-btn" onClick={() => {
                        const nextZoom = Math.max(zoom - 10, 50);
                        setZoom(nextZoom);
                        zoomRef.current = nextZoom;
                      }} title={t('zoomOut')} aria-label={t('zoomOut')}>−</button>
                      <button className="toolbar-btn" onClick={resetMapView} title={t('resetView')} aria-label={t('resetView')}>⌂</button>
                      <button className="toolbar-btn" onClick={() => {
                        const nextZoom = Math.min(zoom + 10, 200);
                        setZoom(nextZoom);
                        zoomRef.current = nextZoom;
                      }} title={t('zoomIn')} aria-label={t('zoomIn')}>+</button>
                    </div>
                  </div>
                  <div
                    className={`utility-map-container ${isPlacingMarker || isPlacingLine || isPlacingLineGroup ? 'placing-mode' : ''}`}
                    ref={mapStageRef}
                    onClick={handleMapClick}
                    onMouseDown={handleMapMouseDown}
                    style={{
                      cursor: (isPlacingMarker || isPlacingLine || isPlacingLineGroup) ? 'crosshair' : isDragging ? 'grabbing' : 'grab',
                    }}
                  >
                    <div
                      className="utility-map-inner"
                      style={{
                        transform: `translate(${panX}px, ${panY}px) rotate(${rotation}deg) scale(${zoom / 100})`,
                        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                      }}
                    >
                      {mapDetails.image_url && (
                        <img
                          ref={mapImageRef}
                          src={getFileUrl(mapDetails.image_url)}
                          alt={mapDetails.name}
                          className="map-image-display"
                          draggable="false"
                        />
                      )}

                      {mapConnectors.length > 0 && (
                        <svg className="utility-map-connectors" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                          {mapConnectors.map(({ point, parent }) => (
                            <line
                              key={`${parent.id}-${point.id}`}
                              x1={parent.x}
                              y1={parent.y}
                              x2={point.x}
                              y2={point.y}
                            />
                          ))}
                        </svg>
                      )}

                      {mapDetails.utility_points
                        .filter(isPointVisible)
                        .map((point) => (
                          (() => {
                            const position = getPointPosition(point);
                            const groupChildOffset = getGroupChildOffset(point);
                            const groupChild = isGroupChild(point, selectedLineGroup);
                            const groupLineCount = point.utility_type === 'line_group'
                              ? mapDetails.utility_points.filter((candidate) => (
                                isGroupChild(candidate, point)
                              )).length
                              : 0;
                            return (
                              <div
                                key={point.id}
                                className={`utility-map-marker ${point.utility_type === 'line' ? 'line-marker' : point.utility_type === 'line_group' ? 'line-group-marker' : 'zone-marker'} ${groupChild ? 'line-group-child-marker' : ''} ${selectedParentZone && selectedParentZone.id === point.id ? 'selected-parent' : ''} ${selectedLineGroup && selectedLineGroup.id === point.id ? 'selected-group' : ''}`}
                                style={{
                                  left: `${position.x}%`,
                                  top: `${position.y}%`,
                                  transform: `translate(calc(-50% + ${groupChildOffset.x}px), calc(-50% + ${groupChildOffset.y}px))`,
                                }}
                                title={point.name}
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  if (point.utility_type === 'line_group') {
                                    setSelectedLineGroup(point);
                                    const parentId = getParentIdFromPoint(point);
                                    setSelectedParentZone(mapDetails.utility_points.find((candidate) => candidate.id === parentId) || null);
                                  } else if (point.utility_type !== 'line') {
                                    const group = mapDetails.utility_points.find((candidate) => isGroupChild(point, candidate));
                                    if (group) {
                                      setSelectedLineGroup(group);
                                      const parentId = getParentIdFromPoint(group);
                                      setSelectedParentZone(mapDetails.utility_points.find((candidate) => candidate.id === parentId) || null);
                                    } else {
                                      setSelectedParentZone(point);
                                      setSelectedLineGroup(null);
                                    }
                                  }
                                }}
                              >
                                {point.utility_type === 'line_group' ? (
                                  <>
                                    <span
                                      className={`line-group-dot ${normalizeTeam(point.team) === 'ct' ? 'ct' : 't'}`}
                                      aria-hidden="true"
                                    />
                                    <span className="line-group-count" aria-hidden="true">{groupLineCount}</span>
                                  </>
                                ) : point.utility_type === 'line' ? (
                                  <span
                                    className={`line-group-dot ${normalizeTeam(point.team) === 'ct' ? 'ct' : 't'}`}
                                    aria-label={point.name}
                                  />
                                ) : groupChild ? (
                                  <span
                                    className={`line-group-child-dot ${normalizeTeam(point.team) === 'ct' ? 'ct' : 't'}`}
                                    aria-label={point.name}
                                  />
                                ) : (
                                  <img
                                    src={getMarkerIconName(point)}
                                    alt={t(point.utility_type)}
                                    className="marker-icon"
                                  />
                                )}
                              </div>
                            );
                          })()
                        ))}

                      {showForm && (
                        <div
                          className={`utility-map-marker active ${pointForm.utility_type === 'line_group' ? 'line-group-marker' : ''}`}
                          style={{
                            left: `${pointForm.x}%`,
                            top: `${pointForm.y}%`,
                            backgroundColor: utilityColors[pointForm.utility_type],
                            animation: 'pulse-glow 1s infinite',
                          }}
                        >
                          {pointForm.utility_type === 'line_group' ? (
                            <>
                              <span
                                className={`line-group-dot ${normalizeTeam(pointForm.team) === 'ct' ? 'ct' : 't'}`}
                                aria-hidden="true"
                              />
                              <span className="line-group-count" aria-hidden="true">0</span>
                            </>
                          ) : (
                            <img
                              src={getMarkerIconName({ utility_type: pointForm.utility_type, team: pointForm.team })}
                              alt={t(pointForm.utility_type)}
                              className="marker-icon"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {(isPlacingMarker || isPlacingLine || isPlacingLineGroup) && (
                    <p className="instruction-text">
                      {isPlacingMarker
                        ? t('clickToPlaceMarker')
                        : isPlacingLineGroup
                          ? selectedParentZone ? t('clickToPlaceLineGroup') : t('selectParentZoneForGroup')
                          : selectedLineGroup || selectedParentZone
                            ? t('clickToPlaceLine')
                            : t('selectParentZoneForGroup')}
                    </p>
                  )}
                </div>
              </div>

              {/* Liste des points */}
              <div className="points-management">
                <h3>{t('existingPointsTitle')} ({mapDetails.utility_points.length})</h3>
                <div className="points-list">
                  {mapDetails.utility_points.length === 0 ? (
                    <div className="empty-state">
                      <p>{t('noPointsForMap')}</p>
                    </div>
                  ) : (
                    mapDetails.utility_points
                      .filter(isPointVisible)
                      .map((point) => (
                      <div key={point.id} className="point-card">
                        <div className="point-info">
                          <h4>{point.name}</h4>
                          <div className="point-details">
                            <span
                              className="badge"
                              style={{
                                backgroundColor: utilityColors[point.utility_type],
                              }}
                            >
                              {t(point.utility_type === 'line_group' ? 'lineGroup' : point.utility_type)}
                            </span>
                            <span className={`team-badge ${point.team === 'ct' || point.team === 'CT' ? 'ct' : 't'}`}>
                              {getTeamLabel(point.team)}
                            </span>
                            <span className="coordinates">
                              {(() => {
                                const position = getPointPosition(point);
                                return <>📍 {position.x}% × {position.y}%</>;
                              })()}
                            </span>
                          </div>
                        </div>
                        <div className="point-actions">
                          <button
                            className="btn-edit"
                            onClick={() => startEditingPoint(point)}
                            aria-label={t('edit')}
                          >
                            ✎
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDeletePoint(point.id)}
                            aria-label={t('delete')}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UtilityManager;
