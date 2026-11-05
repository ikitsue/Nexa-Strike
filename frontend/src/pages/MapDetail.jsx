import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { mapsAPI, getFileUrl, getFileUrlFallbacks } from '../api/supabaseApi';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../i18n';
import ImageLightbox from '../components/ImageLightbox';
import { useCookieConsent } from '../../../shared/consent/CookieConsent';
import './MapDetail.css';

const utilityColors = {
  smoke: '#9B59B6',
  molotov: '#E74C3C',
  flash: '#F39C12',
  grenade: '#E67E22',
  line: '#95a5a6',
  line_group: '#00d4ff',
};

const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    let videoId = null;

    if (hostname === 'youtu.be') {
      videoId = parsedUrl.pathname.slice(1);
    } else if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) {
      videoId = parsedUrl.searchParams.get('v') || parsedUrl.pathname.match(/\/embed\/([^/]+)/)?.[1];
    }

    return videoId ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` : null;
  } catch {
    return null;
  }
};

const initialFilters = {
  smoke: true,
  molotov: false,
  flash: false,
  grenade: false,
};

const normalizeFilters = (savedFilters) => {
  const selectedType = Object.keys(initialFilters).find((type) => (
    typeof savedFilters?.[type] === 'boolean' ? savedFilters[type] : initialFilters[type]
  ));
  return Object.fromEntries(
    Object.keys(initialFilters).map((type) => [type, type === selectedType]),
  );
};

const getMapDetailPreferences = (mapId) => {
  const savedPreferences = localStorage.getItem(`nexastrike-map-detail-preferences-${mapId}`);
  if (!savedPreferences) {
    return { filters: initialFilters, selectedTeam: 'all' };
  }

  let preferences;
  try {
    preferences = JSON.parse(savedPreferences);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { filters: initialFilters, selectedTeam: 'all' };
    }
    throw error;
  }

  const savedFilters = preferences?.filters;
  return {
    filters: savedFilters ? normalizeFilters(savedFilters) : initialFilters,
    selectedTeam: ['all', 'ct', 't'].includes(preferences?.selectedTeam) ? preferences.selectedTeam : 'all',
  };
};

const metadataValueKeys = {
  yes: 'jumpThrowYes',
  no: 'jumpThrowNo',
  crouching: 'movementCrouching',
  standing: 'movementStanding',
  walking_one_step: 'movementWalkingOneStep',
  walking_two_step: 'movementWalkingTwoSteps',
  running_one_step: 'movementRunningOneStep',
  running_two_step: 'movementRunningTwoSteps',
  left_click: 'leftClick',
  right_click: 'rightClick',
  left_right_click: 'leftAndRightClick',
  easy: 'difficultyEasy',
  medium: 'difficultyMedium',
  hard: 'difficultyHard',
};

const translateMetadataValue = (value, t) => {
  const normalizedValue = String(value).toLowerCase().replace(/[\s+]+/g, '_');
  const translationKey = metadataValueKeys[normalizedValue];
  return translationKey ? t(translationKey) : value;
};

const MapDetail = () => {
  const { t } = useLanguage();
  const { preferences, openSettings } = useCookieConsent();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [map, setMap] = useState(null);
  const [points, setPoints] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [consoleCommandMessage, setConsoleCommandMessage] = useState('');
  const [youtubeIntroCompletedKey, setYoutubeIntroCompletedKey] = useState(null);
  const [lineImageView, setLineImageView] = useState('zoom_in');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(() => getMapDetailPreferences(id).filters);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeView, setActiveView] = useState('official');
  const [selectedTeam, setSelectedTeam] = useState(() => getMapDetailPreferences(id).selectedTeam);
  const loadedPreferencesMapId = useRef(id);
  const skipPreferenceSave = useRef(false);
  const zoomContainerRef = useRef(null);
  const mapStageInnerRef = useRef(null);
  const zoomRef = useRef(100);
  const panRef = useRef({ x: 0, y: 0 });
  const isMapHoverRef = useRef(false);
  const didDragMapRef = useRef(false);
  const dragPointerStartRef = useRef({ x: 0, y: 0 });
  const dragPointerIdRef = useRef(null);
  const activePointersRef = useRef(new Map());
  const pinchStartRef = useRef(null);
  const [mapsList, setMapsList] = useState([]);
  const [mapsOpen, setMapsOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const headerMapsDropdownRef = useRef(null);
  const sidebarMapsDropdownRef = useRef(null);

  useEffect(() => {
    if (loadedPreferencesMapId.current === id) return;

    const savedPreferences = getMapDetailPreferences(id);
    setFilters(savedPreferences.filters);
    setSelectedTeam(savedPreferences.selectedTeam);
    loadedPreferencesMapId.current = id;
    skipPreferenceSave.current = true;
  }, [id]);

  useEffect(() => {
    if (skipPreferenceSave.current) {
      skipPreferenceSave.current = false;
      return;
    }

    localStorage.setItem(
      `nexastrike-map-detail-preferences-${id}`,
      JSON.stringify({ filters, selectedTeam }),
    );
  }, [id, filters, selectedTeam]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const mapResponse = await mapsAPI.getById(id);
        const fetchedPoints = mapResponse.data?.utility_points || [];
        setMap(mapResponse.data);
        setPoints(fetchedPoints);
        setSelectedPoint(null);
      } catch (error) {
        console.error('Error fetching map details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    panRef.current = { x: panX, y: panY };
  }, [panX, panY]);

  useEffect(() => {
    setLineImageView('zoom_in');
    setConsoleCommandMessage('');
  }, [selectedPoint?.id]);

  const copyConsoleCommand = async (command) => {
    try {
      if (typeof navigator.clipboard?.writeText !== 'function') {
        throw new Error('Clipboard API is not available');
      }
      await navigator.clipboard.writeText(command);
      setConsoleCommandMessage(t('consoleCommandCopied'));
    } catch (error) {
      console.error('Failed to copy console command:', error);
      setConsoleCommandMessage(t('consoleCommandCopyError'));
    }
  };

  const selectedYoutubeEmbedUrl = getYouTubeEmbedUrl(selectedPoint?.video_url);
  const youtubeIntroKey = selectedYoutubeEmbedUrl && selectedPoint
    ? `${id}:${selectedPoint.id}:${selectedYoutubeEmbedUrl}`
    : null;

  useEffect(() => {
    setYoutubeIntroCompletedKey(null);
    if (!youtubeIntroKey || !preferences.externalMedia) return undefined;
    const timeoutId = window.setTimeout(() => {
      setYoutubeIntroCompletedKey(youtubeIntroKey);
    }, 15000);
    return () => window.clearTimeout(timeoutId);
  }, [youtubeIntroKey, preferences.externalMedia]);

  const orderMaps = (mapsList) => {
    const mapPool = ['ancient', 'anubis', 'dust ii', 'inferno', 'cache', 'nuke', 'mirage'];
    const ancientSeasonMapNames = ['stronghold', 'warden', 'alpine', 'sanctum wingman'];
    const wingmanMapNames = ['el dorado wingman', 'debris wingman'];

    const normalizedName = (name) => String(name || '').toLowerCase();
    const normalizedCategory = (cat) => String(cat || '').toLowerCase();

    const officialMaps = mapsList.filter((map) => mapPool.includes(normalizedName(map.name)));
    const premiereMaps = mapsList.filter((map) => {
      const name = normalizedName(map.name);
      const cat = normalizedCategory(map.category);
      const isPremierCategory = !map.category || ['premier mod', 'mode competitive', 'competitive mode'].includes(cat);
      return !mapPool.includes(name) && !ancientSeasonMapNames.includes(name) && !wingmanMapNames.includes(name) && isPremierCategory;
    });
    const wingmanMaps = mapsList.filter((map) => (normalizedCategory(map.category) === 'wingman' || wingmanMapNames.includes(normalizedName(map.name))) && !ancientSeasonMapNames.includes(normalizedName(map.name)));
    const ancientSeasonMaps = mapsList.filter((map) => ancientSeasonMapNames.includes(normalizedName(map.name)) || normalizedCategory(map.category) === 'map des ancien saison');
    const comingSoonMaps = mapsList.filter((map) => normalizedCategory(map.category) === 'à venir' || normalizedCategory(map.category) === 'coming soon');

    const uniqueOrdered = [...officialMaps, ...premiereMaps, ...wingmanMaps, ...ancientSeasonMaps, ...comingSoonMaps];
    const seen = new Set();
    return uniqueOrdered.filter((map) => {
      if (seen.has(map.id)) return false;
      seen.add(map.id);
      return true;
    });
  };

  useEffect(() => {
    // fetch all maps for the dropdown
    let mounted = true;
    const fetchMaps = async () => {
      try {
        const res = await mapsAPI.getAll();
        if (!mounted) return;
        setMapsList(orderMaps(res.data || []));
      } catch (err) {
        console.error('Failed to fetch maps list', err);
      }
    };
    fetchMaps();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const handleOutside = (e) => {
      const clickedInsideHeaderSelector = headerMapsDropdownRef.current?.contains(e.target);
      const clickedInsideSidebarSelector = sidebarMapsDropdownRef.current?.contains(e.target);
      if (!clickedInsideHeaderSelector && !clickedInsideSidebarSelector) {
        setMapsOpen(false);
      }
    };
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  const handleWheel = (e) => {
    const container = zoomContainerRef.current;
    if (!container) return;

    const isZoomGesture = e.deltaY !== 0;
    if (!isZoomGesture) return;

    e.preventDefault();

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta = e.deltaY < 0 ? 10 : -10;
    const nextZoom = Math.min(Math.max(zoomRef.current + delta, 50), 220);
    const prevScale = zoomRef.current / 100;
    const nextScale = nextZoom / 100;

    const pointX = (mouseX - rect.width / 2 - panRef.current.x) / prevScale;
    const pointY = (mouseY - rect.height / 2 - panRef.current.y) / prevScale;

    const nextPanX = mouseX - rect.width / 2 - pointX * nextScale;
    const nextPanY = mouseY - rect.height / 2 - pointY * nextScale;

    zoomRef.current = nextZoom;
    panRef.current = { x: nextPanX, y: nextPanY };
    setZoom(nextZoom);
    setPanX(nextPanX);
    setPanY(nextPanY);
  };

  const applyMapTransform = (nextZoom, nextPan) => {
    if (!mapStageInnerRef.current) return;
    mapStageInnerRef.current.style.transform = `rotate(${rotation}deg) scale(${nextZoom / 100}) translate(${nextPan.x}px, ${nextPan.y}px)`;
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      const pointer = activePointersRef.current.get(e.pointerId);
      if (!pointer) return;

      activePointersRef.current.set(e.pointerId, { ...pointer, x: e.clientX, y: e.clientY });
      const touchPointers = [...activePointersRef.current.values()].filter((item) => item.pointerType === 'touch');
      const pinchStart = pinchStartRef.current;

      if (pinchStart && touchPointers.length >= 2) {
        const [first, second] = touchPointers;
        const distance = Math.hypot(second.x - first.x, second.y - first.y);
        const midpointX = (first.x + second.x) / 2;
        const midpointY = (first.y + second.y) / 2;
        const container = zoomContainerRef.current;

        if (container && pinchStart.distance > 0) {
          const rect = container.getBoundingClientRect();
          const nextZoom = Math.min(
            Math.max(pinchStart.zoom * (distance / pinchStart.distance), 50),
            220,
          );
          const scale = nextZoom / 100;
          const initialScale = pinchStart.zoom / 100;
          const pointX = (pinchStart.midpointX - rect.width / 2 - pinchStart.pan.x) / initialScale;
          const pointY = (pinchStart.midpointY - rect.height / 2 - pinchStart.pan.y) / initialScale;
          const nextPanX = midpointX - rect.left - rect.width / 2 - pointX * scale;
          const nextPanY = midpointY - rect.top - rect.height / 2 - pointY * scale;

          zoomRef.current = nextZoom;
          panRef.current = { x: nextPanX, y: nextPanY };
          applyMapTransform(nextZoom, panRef.current);
          didDragMapRef.current = true;
        }
        return;
      }

      if (e.pointerId !== dragPointerIdRef.current) return;

      if (
        Math.hypot(
          e.clientX - dragPointerStartRef.current.x,
          e.clientY - dragPointerStartRef.current.y,
        ) > 3
      ) {
        didDragMapRef.current = true;
      }

      const nextPanX = e.clientX - dragStart.x;
      const nextPanY = e.clientY - dragStart.y;
      panRef.current = { x: nextPanX, y: nextPanY };
      applyMapTransform(zoomRef.current, panRef.current);
    };

    const handlePointerEnd = (e) => {
      if (!activePointersRef.current.has(e.pointerId)) return;

      activePointersRef.current.delete(e.pointerId);
      const touchPointers = [...activePointersRef.current.entries()]
        .filter(([, pointer]) => pointer.pointerType === 'touch');

      if (pinchStartRef.current) {
        pinchStartRef.current = null;
        setZoom(zoomRef.current);
        setPanX(panRef.current.x);
        setPanY(panRef.current.y);
        if (touchPointers.length === 1) {
          const [pointerId, pointer] = touchPointers[0];
          dragPointerIdRef.current = pointerId;
          dragPointerStartRef.current = { x: pointer.x, y: pointer.y };
          setDragStart({ x: pointer.x - panRef.current.x, y: pointer.y - panRef.current.y });
          setIsDragging(true);
          return;
        }
      }

      if (e.pointerId === dragPointerIdRef.current) {
        dragPointerIdRef.current = null;
        setPanX(panRef.current.x);
        setPanY(panRef.current.y);
        setIsDragging(false);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [dragStart, rotation]);

  useEffect(() => {
    const handleGlobalWheel = (e) => {
      if (!isMapHoverRef.current) return;

      const container = zoomContainerRef.current;
      if (!container || !container.contains(e.target)) return;

      e.preventDefault();
      e.stopPropagation();
      handleWheel(e);
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleGlobalWheel);
  }, []);

  if (loading) return <div className="loading">{t('loading')}</div>;
  if (!map) return <div className="loading">{t('mapNotFound')}</div>;

  const normalizeTeam = (team) => {
    const normalized = String(team || '').toLowerCase();
    return normalized === 'ct' ? 'ct' : normalized === 't' ? 't' : 'all';
  };

  const getTeamLabel = (team) => {
    const normalized = normalizeTeam(team);
    if (normalized === 'ct') return 'CT';
    if (normalized === 't') return 'T';
    return 'ALL';
  };

  const getTeamBadgeClass = (team) => {
    const normalized = normalizeTeam(team);
    return normalized === 'ct' ? 'team-badge-ct' : normalized === 't' ? 'team-badge-t' : 'team-badge-all';
  };

  const getMarkerIconName = (point) => {
    const rawType = String(point.utility_type || '').toLowerCase();
    const validTypes = ['smoke', 'flash', 'molotov', 'grenade'];
    const type = validTypes.includes(rawType) ? rawType : 'smoke';
    const prefix = normalizeTeam(point.team) === 'ct' ? 'CT' : 'T';
    return `/icon/${prefix}_${type}.png`;
  };

  const getParentIdFromDescription = (point) => {
    if (!point?.description) return null;
    const match = String(point.description).match(/parent:(\d+)/i);
    return match ? Number(match[1]) : null;
  };

  const getPointPosition = (point) => {
    if (point.utility_type !== 'line_group') {
      const parent = points.find((candidate) => candidate.id === getParentIdFromDescription(point));
      if (parent?.utility_type === 'line_group') return parent;
    }

    return point;
  };

  const getLineGroupForPoint = (point) => {
    if (!point || point.utility_type === 'line_group') return null;
    const parent = points.find((candidate) => candidate.id === getParentIdFromDescription(point));
    return parent?.utility_type === 'line_group' ? parent : null;
  };

  const getGroupChildren = (group) => points.filter((point) => (
    point.utility_type !== 'line_group'
    && getParentIdFromDescription(point) === group.id
  ));

  const getGroupChildOffset = (point) => {
    const openGroup = selectedPoint?.utility_type === 'line_group'
      ? selectedPoint
      : getLineGroupForPoint(selectedPoint);
    const group = getLineGroupForPoint(point);
    if (!openGroup || group?.id !== openGroup.id) return { x: 0, y: 0 };

    const children = getGroupChildren(group);
    const childIndex = children.findIndex((child) => child.id === point.id);

    return {
      x: (childIndex - (children.length - 1) / 2) * 30,
      y: -32,
    };
  };

  const getNearestParentForLine = (linePoint) => {
    const parentCandidates = points.filter((point) => point.utility_type !== 'line' && point.utility_type !== 'line_group');
    if (parentCandidates.length === 0) return null;

    return parentCandidates.reduce((nearest, point) => {
      const distance = Math.hypot(point.x - linePoint.x, point.y - linePoint.y);
      if (!nearest) return { point, distance };
      return distance < nearest.distance ? { point, distance } : nearest;
    }, null)?.point ?? null;
  };

  const getRelatedLines = (parentPoint) => {
    return points.filter((linePoint) => {
      if (linePoint.utility_type !== 'line') return false;
      const parentId = getParentIdFromDescription(linePoint);
      if (parentId != null) return parentId === parentPoint.id;

      const nearestParent = getNearestParentForLine(linePoint);
      return nearestParent?.id === parentPoint.id;
    });
  };

  const getRelatedGroups = (parentPoint) => points.filter((point) => (
    point.utility_type === 'line_group'
    && getParentIdFromDescription(point) === parentPoint.id
  ));

  const parsePointMetadata = (description = '') => {
    const parts = String(description)
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);

    const metadata = {
      description: '',
      jump_throw: null,
      movement: null,
      mouse_button: null,
      difficulty: null,
      air_time: null,
      console_command: null,
    };

    const remaining = [];

    parts.forEach((part) => {
      const [keyRaw, ...rest] = part.split(':');
      const key = String(keyRaw || '').trim().toLowerCase().replace(/\s+/g, '_');
      const value = rest.join(':').trim();

      if (key === 'jump_throw') metadata.jump_throw = value || 'Yes';
      else if (key === 'movement') metadata.movement = value;
      else if (key === 'mouse_button') metadata.mouse_button = value;
      else if (key === 'difficulty') metadata.difficulty = value;
      else if (key === 'air_time') metadata.air_time = value;
      else if (key === 'console_command') metadata.console_command = value;
      else if (key === 'parent') {
        // ignore parent metadata used for line associations
      } else {
        remaining.push(part);
      }
    });

    metadata.description = remaining.join(' | ').trim();
    return metadata;
  };

  const selectedLineGroup = selectedPoint?.utility_type === 'line'
    ? getLineGroupForPoint(selectedPoint)
    : null;
  const selectedLineParentId = selectedPoint?.utility_type === 'line'
    ? getParentIdFromDescription(selectedLineGroup || selectedPoint)
    : null;
  const selectedLineParent = selectedPoint?.utility_type === 'line'
    ? points.find((point) => (
      point.id === selectedLineParentId
      && point.utility_type !== 'line'
      && point.utility_type !== 'line_group'
    )) || (selectedLineGroup ? null : getNearestParentForLine(selectedPoint))
    : null;
  const selectedLineContextPoints = selectedLineParent
    ? [
      selectedLineParent,
      ...getRelatedLines(selectedLineParent),
      ...getRelatedGroups(selectedLineParent).flatMap((group) => [group, ...getGroupChildren(group)]),
    ]
    : selectedPoint?.utility_type === 'line'
      ? [selectedPoint, ...(selectedLineGroup ? [selectedLineGroup, ...getGroupChildren(selectedLineGroup)] : [])]
      : [];

  // Exclude 'line' points from normal filters — they are shown only when related to a selected parent
  const filteredPoints = points.filter((point) => {
    if (point.utility_type === 'line' || point.utility_type === 'line_group') return false;
    const typeMatch = filters[point.utility_type] ?? false;
    const normalizedTeam = normalizeTeam(point.team);
    const teamMatch = selectedTeam === 'all' || normalizedTeam === selectedTeam;
    return typeMatch && teamMatch;
  });

  const visiblePoints = selectedPoint?.utility_type === 'line_group' ? [] : [...filteredPoints];
  if (selectedPoint) {
    if (!visiblePoints.find((point) => point.id === selectedPoint.id)) {
      visiblePoints.push(selectedPoint);
    }

    const selectedGroup = getLineGroupForPoint(selectedPoint);
    if (selectedGroup) {
      if (!visiblePoints.find((point) => point.id === selectedGroup.id)) {
        visiblePoints.push(selectedGroup);
      }
      getGroupChildren(selectedGroup).forEach((child) => {
        if (!visiblePoints.find((point) => point.id === child.id)) visiblePoints.push(child);
      });
    } else if (selectedPoint.utility_type === 'line') {
      const parentId = getParentIdFromDescription(selectedPoint);
      const parentPoint = points.find((point) => point.id === parentId);
      if (parentPoint?.utility_type === 'line_group' && !visiblePoints.find((point) => point.id === parentPoint.id)) {
        visiblePoints.push(parentPoint);
      }
    } else if (selectedPoint.utility_type === 'line_group') {
      const relatedLines = getGroupChildren(selectedPoint);

      relatedLines.forEach((rl) => {
        if (!visiblePoints.find((v) => v.id === rl.id)) visiblePoints.push(rl);
      });
    } else if (selectedPoint.utility_type !== 'line') {
      const relatedPoints = [
        ...getRelatedGroups(selectedPoint),
        ...getRelatedLines(selectedPoint),
      ];

      relatedPoints.forEach((relatedPoint) => {
        if (!visiblePoints.find((visiblePoint) => visiblePoint.id === relatedPoint.id)) {
          visiblePoints.push(relatedPoint);
        }
      });
    }
  }

  if (selectedPoint?.utility_type === 'line') {
    selectedLineContextPoints.forEach((point) => {
      if (!visiblePoints.find((visiblePoint) => visiblePoint.id === point.id)) {
        visiblePoints.push(point);
      }
    });
  }

  const selectedGroup = selectedPoint?.utility_type === 'line_group'
    ? selectedPoint
    : selectedPoint && getLineGroupForPoint(selectedPoint);
  const mapVisiblePoints = selectedPoint?.utility_type === 'line'
    ? visiblePoints.filter((point) => selectedLineContextPoints.some((contextPoint) => contextPoint.id === point.id))
    : selectedGroup
    ? visiblePoints.filter((point) => point.id === selectedGroup.id || getLineGroupForPoint(point)?.id === selectedGroup.id)
    : selectedPoint && selectedPoint.utility_type !== 'line'
      ? visiblePoints.filter((point) => point.id === selectedPoint.id || point.utility_type === 'line' || point.utility_type === 'line_group')
      : visiblePoints;

  const mapConnectors = selectedPoint?.utility_type === 'line_group'
    ? (() => {
      const parent = points.find((point) => point.id === getParentIdFromDescription(selectedPoint));
      return parent ? [{ point: selectedPoint, parent }] : [];
    })()
    : selectedPoint?.utility_type === 'line' && selectedLineParent
      ? [
        ...getRelatedLines(selectedLineParent).map((point) => ({ point, parent: selectedLineParent })),
        ...getRelatedGroups(selectedLineParent).map((point) => ({ point, parent: selectedLineParent })),
      ]
    : selectedPoint && selectedPoint.utility_type !== 'line'
      ? [
        ...getRelatedLines(selectedPoint).map((point) => ({ point, parent: selectedPoint })),
        ...getRelatedGroups(selectedPoint).map((point) => ({ point, parent: selectedPoint })),
      ]
      : [];

  const activePoint = selectedPoint ? visiblePoints.find((point) => point.id === selectedPoint.id) || visiblePoints[0] || null : null;
  const lineZoomImages = activePoint?.utility_type === 'line'
    ? [
      { key: 'zoom_in', url: activePoint.zoom_in_image_url },
      { key: 'zoom_out', url: activePoint.zoom_out_image_url },
    ].filter((image) => image.url)
    : [];
  const activeLineImage = lineZoomImages.find((image) => image.key === lineImageView) || lineZoomImages[0];

  const toggleFilter = (type) => {
    setFilters((prev) => Object.fromEntries(
      Object.keys(initialFilters).map((filterType) => [
        filterType,
        filterType === type && !prev[type],
      ]),
    ));
  };

  const handlePointerDown = (e) => {
    if (e.pointerType === 'mouse' ? (!e.isPrimary || e.button !== 0) : (!e.isPrimary && e.pointerType !== 'touch')) return;

    didDragMapRef.current = false;
    activePointersRef.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      pointerType: e.pointerType,
    });

    const touchPointers = [...activePointersRef.current.values()].filter((pointer) => pointer.pointerType === 'touch');
    if (touchPointers.length >= 2) {
      const [first, second] = touchPointers;
      const rect = zoomContainerRef.current?.getBoundingClientRect();
      if (rect) {
        pinchStartRef.current = {
          distance: Math.hypot(second.x - first.x, second.y - first.y),
          zoom: zoomRef.current,
          pan: panRef.current,
          midpointX: (first.x + second.x) / 2 - rect.left,
          midpointY: (first.y + second.y) / 2 - rect.top,
        };
      }
      dragPointerIdRef.current = null;
      setIsDragging(true);
      if (mapStageInnerRef.current) {
        mapStageInnerRef.current.style.transition = 'none';
      }
      return;
    }

    dragPointerIdRef.current = e.pointerId;
    dragPointerStartRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    setDragStart({ x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y });
  };

  const loadMapById = (mapId) => {
    setMapsOpen(false);
    if (String(mapId) === id) return;

    setSelectedPoint(null);
    setZoom(100);
    setPanX(0);
    setPanY(0);
    navigate(`/map/${mapId}`);
  };

  const resetView = () => {
    setZoom(100);
    setRotation(0);
    setPanX(0);
    setPanY(0);
  };

  const rotateLeft = () => {
    setRotation((prev) => prev - 90);
  };

  const rotateRight = () => {
    setRotation((prev) => prev + 90);
  };

  const counts = points.reduce((acc, point) => {
    acc[point.utility_type] = (acc[point.utility_type] || 0) + 1;
    return acc;
  }, {});

  const youtubeEmbedUrl = getYouTubeEmbedUrl(activePoint?.video_url);
  const showYoutubeIntro = Boolean(
    youtubeIntroKey
    && preferences.externalMedia
    && youtubeIntroCompletedKey !== youtubeIntroKey,
  );

  return (
    <div className="map-detail">
      <header className="map-detail-header">
        <div className="map-detail-title-group">
          <Link to="/maps" className="map-title-link">
            <h1>{map.name}</h1>
          </Link>
          <section className="map-selector-control map-selector-control--header" ref={headerMapsDropdownRef}>
            <button
              type="button"
              className="select-pill"
              aria-expanded={mapsOpen}
              aria-haspopup="listbox"
              onClick={() => setMapsOpen((open) => !open)}
            >
              <span>{map.name}</span>
              <span aria-hidden="true">▾</span>
            </button>

            {mapsOpen && (
              <div className="map-dropdown" role="listbox" aria-label={t('switchMap')}>
                {mapsList.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="map-dropdown-item"
                    role="option"
                    aria-selected={String(m.id) === id}
                    onClick={() => loadMapById(m.id)}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </header>

      <div className="map-detail-shell">
        <aside className="map-sidebar">
          <section className="control-card map-selector-control map-selector-control--sidebar" ref={sidebarMapsDropdownRef}>
            <h2>{t('switchMap')}</h2>
            <button
              type="button"
              className="select-pill"
              aria-expanded={mapsOpen}
              aria-haspopup="listbox"
              onClick={() => setMapsOpen((open) => !open)}
            >
              <span>{map.name}</span>
              <span aria-hidden="true">▾</span>
            </button>

            {mapsOpen && (
              <div className="map-dropdown" role="listbox" aria-label={t('switchMap')}>
                {mapsList.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="map-dropdown-item"
                    role="option"
                    aria-selected={String(m.id) === id}
                    onClick={() => loadMapById(m.id)}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </section>

          <div
            id="map-detail-filters"
            className={`map-detail-filters${mobileFiltersOpen ? '' : ' is-collapsed'}`}
          >
            <section className="control-card">
              <h2>{t('nadeType')}</h2>
              <div className="filter-pills">
                {Object.keys(filters).map((type) => (
                  <button
                    key={type}
                    className={`pill-button ${filters[type] ? 'active' : ''}`}
                    style={{
                      borderColor: filters[type] ? utilityColors[type] : '#334155',
                      color: filters[type] ? '#fff' : '#cbd5e1',
                      backgroundColor: filters[type] ? `${utilityColors[type]}22` : 'transparent',
                    }}
                    onClick={() => toggleFilter(type)}
                  >
                    <span className="pill-emoji">
                      {type === 'smoke' ? '💨' : type === 'flash' ? '⚡' : type === 'molotov' ? '🔥' : type === 'grenade' ? '💥' : type === 'line' ? '─' : '•'}
                    </span>
                    <span>{t(type)}</span>
                    <span className="pill-count">{counts[type] || 0}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="control-card">
              <h2>{t('team')}</h2>
              <div className="team-buttons">
                {['all', 'ct', 't'].map((team) => (
                  <button
                    key={team}
                    className={`team-button ${selectedTeam === team ? 'active' : ''}`}
                    onClick={() => setSelectedTeam(team)}
                  >
                    {team === 'all' ? t('allTeams') : team.toUpperCase()}
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Other Options removed per request */}

          <section className="control-card">
            <h2>{t('utilityPoints')}</h2>
            <div className="point-list">
              {visiblePoints.map((point) => (
                <button
                  key={point.id}
                  className={`point-row ${activePoint?.id === point.id ? 'active' : ''}`}
                  onClick={() => setSelectedPoint(point)}
                >
                  <span className="point-row-name">{point.name}</span>
                  <span className={`point-row-type ${getTeamBadgeClass(point.team)}`}>
                    {getTeamLabel(point.team)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <main className="map-main">
          <div className="map-view-card">
            <div className="map-toolbar">
              <div className="toolbar-group">
                <button className="toolbar-btn" onClick={rotateLeft} title={t('rotateLeft')}>
                  ↺
                </button>
                <button className="toolbar-btn" onClick={rotateRight} title={t('rotateRight')}>
                  ↻
                </button>
              </div>
              <div className="toolbar-group">
                <button className="toolbar-btn" onClick={() => setZoom((prev) => Math.max(prev - 10, 50))} title={t('zoomOut')}>
                  −
                </button>
                <button className="toolbar-btn" onClick={resetView} title={t('resetView')}>
                  ⌂
                </button>
                <button className="toolbar-btn" onClick={() => setZoom((prev) => Math.min(prev + 10, 200))} title={t('zoomIn')}>
                  +
                </button>
              </div>
              <button
                type="button"
                className="mobile-filters-toggle"
                aria-expanded={mobileFiltersOpen}
                aria-controls="map-detail-filters"
                aria-label={mobileFiltersOpen ? t('hideFilters') : t('showFilters')}
                onClick={() => setMobileFiltersOpen((open) => !open)}
              >
                <span aria-hidden="true">{mobileFiltersOpen ? '−' : '+'}</span>
                <span className="mobile-filters-label">
                  {mobileFiltersOpen ? t('hideFilters') : t('showFilters')}
                </span>
              </button>
            </div>

            <div
              className="map-stage"
              onPointerDown={handlePointerDown}
              onMouseEnter={() => {
                isMapHoverRef.current = true;
              }}
              onMouseLeave={() => {
                isMapHoverRef.current = false;
              }}
              ref={zoomContainerRef}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              <div className="map-stage-layer">
                <div
                  className="map-stage-inner"
                  ref={mapStageInnerRef}
                  onClick={() => {
                    if (didDragMapRef.current) {
                      didDragMapRef.current = false;
                      return;
                    }
                    setSelectedPoint(null);
                  }}
                  style={{
                    transform: `rotate(${rotation}deg) scale(${zoom / 100}) translate(${panX}px, ${panY}px)`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                  }}
                >
                  {map.image_url && (
                    <img src={getFileUrl(map.image_url)} alt={map.name} className="map-image-display" />
                  )}

                  {mapConnectors.length > 0 && (
                    <svg className="map-point-connectors" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
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

                  {mapVisiblePoints.map((point) => {
                    const position = getPointPosition(point);
                    const group = point.utility_type === 'line_group' ? point : null;
                    const groupChild = getLineGroupForPoint(point);
                    const groupChildOffset = getGroupChildOffset(point);
                    const groupLineCount = group ? getGroupChildren(group).length : 0;
                    return (
                      <button
                        key={point.id}
                        className={`map-marker ${point.utility_type} ${groupChild ? 'line-group-child' : ''} ${activePoint?.id === point.id ? 'active' : ''} ${selectedPoint && point.utility_type === 'line' && point.description && point.description.includes(`parent:${selectedPoint.id}`) ? 'related' : ''}`}
                        style={{
                          left: `${position.x}%`,
                          top: `${position.y}%`,
                          transform: `translate(calc(-50% + ${groupChildOffset.x}px), calc(-50% + ${groupChildOffset.y}px))`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (didDragMapRef.current) {
                            didDragMapRef.current = false;
                            return;
                          }
                          setSelectedPoint(point);
                        }}
                        title={point.name}
                      >
                        {group ? (
                          <>
                            <span
                              className={`line-group-dot ${normalizeTeam(group.team) === 'ct' ? 'ct' : 't'}`}
                              aria-hidden="true"
                            />
                            <span className="line-group-count" aria-label={`${groupLineCount} ${t('lineGroupLines')}`}>
                              {groupLineCount}
                            </span>
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
                            style={{ transform: `rotate(${-rotation}deg)` }}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {activePoint ? (
              <div className="point-preview">
                <div className="point-preview-head">
                  <div>
                    <h3>{activePoint.name}</h3>
                    <div className="point-preview-badges">
                      <span className={`point-preview-team ${getTeamBadgeClass(activePoint.team)}`}>
                        {getTeamLabel(activePoint.team)}
                      </span>
                      <span className="point-preview-coords">
                        {getPointPosition(activePoint).x}% × {getPointPosition(activePoint).y}%
                      </span>
                    </div>
                    {activePoint.utility_type === 'line' && activePoint.suggested_by && (
                      <p className="point-preview-suggested-by">
                        {t('suggestedByLabel')}: {activePoint.suggested_by}
                      </p>
                    )}
                    <p>{parsePointMetadata(activePoint.description).description}</p>
                    {activePoint.utility_type === 'line' && (() => {
                      const command = parsePointMetadata(activePoint.description).console_command;
                      return command && (
                        <div className="point-console-command">
                          <span>{t('consoleCommand')}</span>
                          <div className="point-console-command-row">
                            <code>{command}</code>
                            <button
                              type="button"
                              className="point-console-command-copy"
                              onClick={() => copyConsoleCommand(command)}
                              aria-label={t('copyCommand')}
                              title={t('copyCommand')}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <rect x="8" y="8" width="12" height="12" rx="2" />
                                <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                              </svg>
                            </button>
                          </div>
                          {consoleCommandMessage && <span className="point-console-command-message" role="status">{consoleCommandMessage}</span>}
                        </div>
                      );
                    })()}
                  </div>
                  <span
                    className="point-badge"
                    style={{ backgroundColor: utilityColors[activePoint.utility_type] }}
                  >
                    {t(activePoint.utility_type === 'line_group' ? 'lineGroup' : activePoint.utility_type)}
                  </span>
                </div>

                <div className="point-meta-grid">
                  {(() => {
                    const meta = parsePointMetadata(activePoint.description);
                    return [
                      { label: t('mouseButton'), value: translateMetadataValue(meta.mouse_button, t) },
                      { label: t('airTime'), value: meta.air_time },
                      { label: t('jumpThrow'), value: translateMetadataValue(meta.jump_throw, t) },
                      { label: t('movement'), value: translateMetadataValue(meta.movement, t) },
                      { label: t('difficultyLevel'), value: translateMetadataValue(meta.difficulty, t) },
                    ]
                      .filter((item) => item.value)
                      .map((item) => (
                        <div key={item.label} className="point-meta-card">
                          <span className="meta-label">{item.label}</span>
                          <span className="meta-value">{item.value}</span>
                        </div>
                      ));
                  })()}
                </div>

                {lineZoomImages.length > 0 && (
                  <div className="line-zoom-image-viewer">
                    <div className="line-zoom-image-tabs" role="group" aria-label={t('lineZoomImages')}>
                      {lineZoomImages.map((image) => (
                        <button
                          key={image.key}
                          type="button"
                          className={`line-zoom-image-tab${activeLineImage?.key === image.key ? ' active' : ''}`}
                          aria-pressed={activeLineImage?.key === image.key}
                          onClick={() => setLineImageView(image.key)}
                        >
                          {t(image.key === 'zoom_in' ? 'lineZoomInImage' : 'lineZoomOutImage')}
                        </button>
                      ))}
                    </div>
                    <div className="line-zoom-image-frame">
                      <span className="line-zoom-image-label">
                        {t(activeLineImage.key === 'zoom_in' ? 'lineZoomInImage' : 'lineZoomOutImage')}
                      </span>
                      <ImageLightbox
                        src={getFileUrl(activeLineImage.url)}
                        fallbackSrc={getFileUrlFallbacks(activeLineImage.url)[1]}
                        alt={`${activePoint.name} - ${t(activeLineImage.key === 'zoom_in' ? 'lineZoomInImage' : 'lineZoomOutImage')}`}
                        className="detail-image line-zoom-image"
                        openLabel={t('viewImage')}
                        closeLabel={t('close')}
                        zoomInLabel={t('zoomIn')}
                        zoomOutLabel={t('zoomOut')}
                        resetZoomLabel={t('resetImageZoom')}
                        zoomControlsLabel={t('imageZoomControls')}
                      />
                    </div>
                  </div>
                )}

                {activePoint.image_url
                  && (activePoint.utility_type !== 'line' || lineZoomImages.length === 0)
                  && !activePoint.image_url.match(/\.(mp4|webm|mov|avi|mkv)$/i) && (
                  <ImageLightbox
                    src={getFileUrl(activePoint.image_url)}
                    fallbackSrc={getFileUrlFallbacks(activePoint.image_url)[1]}
                    alt={activePoint.name}
                    className="detail-image"
                    openLabel={t('viewImage')}
                    closeLabel={t('close')}
                    zoomInLabel={t('zoomIn')}
                    zoomOutLabel={t('zoomOut')}
                    resetZoomLabel={t('resetImageZoom')}
                    zoomControlsLabel={t('imageZoomControls')}
                  />
                )}

                {youtubeEmbedUrl ? (
                  preferences.externalMedia ? (
                    showYoutubeIntro ? (
                      <div className="map-detail-youtube-intro" role="status">
                        <strong>{t('youtubeHdIntroTitle')}</strong>
                        <p>{t('youtubeHdIntroMessage')}</p>
                        <span className="map-detail-youtube-intro-progress" aria-hidden="true" />
                        <button
                          type="button"
                          className="map-detail-youtube-intro-skip"
                          onClick={() => setYoutubeIntroCompletedKey(youtubeIntroKey)}
                        >
                          {t('youtubeHdIntroSkip')}
                        </button>
                      </div>
                    ) : (
                      <iframe
                        src={`${youtubeEmbedUrl}?vq=hd1080`}
                        title={`${activePoint.name} — YouTube`}
                        className="detail-video detail-video-embed"
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allow="encrypted-media; picture-in-picture; fullscreen"
                      />
                    )
                  ) : (
                    <div className="external-media-notice" role="note">
                      <p>
                        {t('externalMediaVideoPrivacyNotice')}
                      </p>
                      <button type="button" onClick={openSettings}>
                        {t('chooseExternalMedia')}
                      </button>
                      <a
                        href={youtubeEmbedUrl.replace('https://www.youtube-nocookie.com/embed/', 'https://www.youtube.com/watch?v=')}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t('openOnYouTube')}
                      </a>
                    </div>
                  )
                ) : (activePoint.video_url || activePoint.image_url?.match(/\.(mp4|webm|mov|avi|mkv)$/i)) && (
                  <video
                    src={getFileUrl(activePoint.video_url || activePoint.image_url)}
                    controls
                    className="detail-video"
                    onError={(e) => {
                      const filePath = activePoint.video_url || activePoint.image_url;
                      const fallbacks = getFileUrlFallbacks(filePath);
                      const next = fallbacks[1];
                      if (next && e.target.src !== next) {
                        e.target.src = next;
                      }
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="point-preview empty">{t('selectNadeFromMapOrList')}</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MapDetail;
