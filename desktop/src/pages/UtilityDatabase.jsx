import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFileUrl, mapsAPI, utilityPointsAPI } from '../api/supabaseApi';
import { useLanguage } from '../i18n';
import './UtilityDatabase.css';

const utilityTypes = ['smoke', 'molotov', 'flash', 'grenade'];
const videoExtensions = /\.(mp4|webm|mov|avi|mkv)$/i;
const preferencesStorageKey = 'nexastrike-utility-database-preferences';
const bookmarkStoragePrefix = 'nexastrike-utility-bookmark-';

const getBookmarkKey = (point) => `${bookmarkStoragePrefix}${point.map_id}-${point.id}`;

const readBookmarkedKeys = () => new Set(
  Object.keys(localStorage)
    .filter((key) => key.startsWith(bookmarkStoragePrefix) && localStorage.getItem(key) === 'true'),
);

const readPreferences = () => {
  const savedPreferences = localStorage.getItem(preferencesStorageKey);
  if (!savedPreferences) return null;

  try {
    const preferences = JSON.parse(savedPreferences);
    return {
      mapIds: Array.isArray(preferences?.mapIds) ? preferences.mapIds.map(String) : null,
      types: Array.isArray(preferences?.types)
        ? utilityTypes.filter((type) => preferences.types.includes(type))
        : utilityTypes,
      mapSearch: typeof preferences?.mapSearch === 'string' ? preferences.mapSearch : '',
      pointSearch: typeof preferences?.pointSearch === 'string' ? preferences.pointSearch : '',
      bookmarksOnly: typeof preferences?.bookmarksOnly === 'boolean' ? preferences.bookmarksOnly : false,
      filtersOpen: typeof preferences?.filtersOpen === 'boolean' ? preferences.filtersOpen : true,
    };
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
};

const orderMaps = (mapsList) => {
  const mapPool = ['ancient', 'anubis', 'dust ii', 'inferno', 'cache', 'nuke', 'mirage'];
  const ancientSeasonMapNames = ['stronghold', 'warden', 'alpine', 'sanctum wingman'];
  const wingmanMapNames = ['el dorado wingman', 'debris wingman'];

  const normalizedName = (name) => String(name || '').toLowerCase();
  const normalizedCategory = (category) => String(category || '').toLowerCase();

  const officialMaps = mapsList.filter((map) => mapPool.includes(normalizedName(map.name)));
  const premiereMaps = mapsList.filter((map) => {
    const name = normalizedName(map.name);
    const category = normalizedCategory(map.category);
    const isPremierCategory = !map.category || ['premier mod', 'mode competitive', 'competitive mode'].includes(category);
    return !mapPool.includes(name) && !ancientSeasonMapNames.includes(name) && !wingmanMapNames.includes(name) && isPremierCategory;
  });
  const wingmanMaps = mapsList.filter((map) => (
    (normalizedCategory(map.category) === 'wingman' || wingmanMapNames.includes(normalizedName(map.name)))
    && !ancientSeasonMapNames.includes(normalizedName(map.name))
  ));
  const ancientSeasonMaps = mapsList.filter((map) => (
    ancientSeasonMapNames.includes(normalizedName(map.name))
    || normalizedCategory(map.category) === 'map des ancien saison'
  ));
  const comingSoonMaps = mapsList.filter((map) => (
    normalizedCategory(map.category) === 'à venir' || normalizedCategory(map.category) === 'coming soon'
  ));

  const seen = new Set();
  return [...officialMaps, ...premiereMaps, ...wingmanMaps, ...ancientSeasonMaps, ...comingSoonMaps]
    .filter((map) => {
      if (seen.has(map.id)) return false;
      seen.add(map.id);
      return true;
    });
};

const getParentIdFromPoint = (point) => {
  if (point.parent_id != null) return String(point.parent_id);
  const match = String(point.description || '').match(/parent:(\d+)/i);
  return match?.[1] || null;
};

const getLineCategory = (point, pointsById) => {
  let parent = pointsById.get(`${point.map_id}:${getParentIdFromPoint(point)}`);
  const visited = new Set();

  while (parent && parent.utility_type === 'line_group' && !visited.has(String(parent.id))) {
    visited.add(String(parent.id));
    const parentId = getParentIdFromPoint(parent);
    if (!parentId) return null;
    parent = pointsById.get(`${parent.map_id}:${parentId}`);
  }

  return utilityTypes.includes(parent?.utility_type) ? parent.utility_type : null;
};

const UtilityDatabase = () => {
  const { t } = useLanguage();
  const [savedPreferences] = useState(readPreferences);
  const [maps, setMaps] = useState([]);
  const [selectedMapIds, setSelectedMapIds] = useState(savedPreferences?.mapIds || []);
  const [points, setPoints] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState(savedPreferences?.types || utilityTypes);
  const [mapSearch, setMapSearch] = useState(savedPreferences?.mapSearch || '');
  const [pointSearch, setPointSearch] = useState(savedPreferences?.pointSearch || '');
  const [bookmarksOnly, setBookmarksOnly] = useState(savedPreferences?.bookmarksOnly || false);
  const [bookmarkedKeys, setBookmarkedKeys] = useState(readBookmarkedKeys);
  const [filtersOpen, setFiltersOpen] = useState(savedPreferences?.filtersOpen ?? true);
  const [loadingMaps, setLoadingMaps] = useState(true);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [bookmarkError, setBookmarkError] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  useEffect(() => {
    const syncBookmarks = () => setBookmarkedKeys(readBookmarkedKeys());
    window.addEventListener('storage', syncBookmarks);
    return () => window.removeEventListener('storage', syncBookmarks);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMaps = async () => {
      try {
        const response = await mapsAPI.getAll();
        if (cancelled) return;
        const availableMaps = orderMaps(response.data || []);
        setMaps(availableMaps);
        const availableMapIds = availableMaps.map((map) => String(map.id));
        setSelectedMapIds(savedPreferences?.mapIds
          ? savedPreferences.mapIds.filter((mapId) => availableMapIds.includes(mapId))
          : availableMapIds);
        setMapsLoaded(true);
      } catch (error) {
        console.error('Failed to load utility database maps:', error);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoadingMaps(false);
      }
    };

    loadMaps();
    return () => {
      cancelled = true;
    };
  }, [savedPreferences]);

  useEffect(() => {
    if (!mapsLoaded) return;

    localStorage.setItem(
      preferencesStorageKey,
      JSON.stringify({
        mapIds: selectedMapIds,
        types: selectedTypes,
        mapSearch,
        pointSearch,
        bookmarksOnly,
        filtersOpen,
      }),
    );
  }, [mapsLoaded, selectedMapIds, selectedTypes, mapSearch, pointSearch, bookmarksOnly, filtersOpen]);

  useEffect(() => {
    if (!selectedMapIds.length) {
      setPoints([]);
      setLoadingPoints(false);
      return undefined;
    }

    let cancelled = false;
    setLoadingPoints(true);
    setLoadError(false);

    const loadPoints = async () => {
      try {
        const response = await utilityPointsAPI.getByMapIds(selectedMapIds);
        if (!cancelled) setPoints(response.data || []);
      } catch (error) {
        console.error('Failed to load utility database points:', error);
        if (!cancelled) {
          setPoints([]);
          setLoadError(true);
        }
      } finally {
        if (!cancelled) setLoadingPoints(false);
      }
    };

    loadPoints();
    return () => {
      cancelled = true;
    };
  }, [selectedMapIds]);

  const mapNames = useMemo(
    () => new Map(maps.map((map) => [String(map.id), map.name])),
    [maps],
  );
  const pointsById = useMemo(
    () => new Map(points.map((point) => [`${point.map_id}:${point.id}`, point])),
    [points],
  );

  const visibleMaps = maps.filter((map) => (
    String(map.name || '').toLowerCase().includes(mapSearch.trim().toLowerCase())
  ));

  const filteredPoints = points.flatMap((point) => {
    if (point.utility_type !== 'line') return [];
    if (bookmarksOnly && !bookmarkedKeys.has(getBookmarkKey(point))) return [];
    const category = getLineCategory(point, pointsById);
    if (!category || !selectedTypes.includes(category)) return [];

    const query = pointSearch.trim().toLowerCase();
    if (!query) return [{ point, category }];

    const matchesSearch = [
      point.name,
      point.description,
      point.suggested_by,
      mapNames.get(String(point.map_id)),
      t(category),
    ].some((value) => String(value || '').toLowerCase().includes(query));
    return matchesSearch ? [{ point, category }] : [];
  });

  const toggleMap = (mapId) => {
    setSelectedMapIds((current) => (
      current.includes(mapId)
        ? current.filter((id) => id !== mapId)
        : [...current, mapId]
    ));
  };

  const toggleType = (type) => {
    setSelectedTypes((current) => (
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type]
    ));
  };

  const toggleBookmark = (point) => {
    const bookmarkKey = getBookmarkKey(point);
    const isBookmarked = bookmarkedKeys.has(bookmarkKey);

    try {
      localStorage.setItem(bookmarkKey, String(!isBookmarked));
      setBookmarkError(false);
      setBookmarkedKeys((current) => {
        const next = new Set(current);
        if (isBookmarked) next.delete(bookmarkKey);
        else next.add(bookmarkKey);
        return next;
      });
    } catch (error) {
      console.error('Failed to save utility bookmark:', error);
      setBookmarkError(true);
    }
  };

  const getTypeLabel = (type) => (type === 'grenade' ? 'HE' : t(type));
  const getTeamLabel = (team) => {
    const normalized = String(team || '').toLowerCase();
    return normalized === 'ct' ? 'CT' : normalized === 't' ? 'T' : t('allTeams');
  };

  return (
    <div className="utility-database">
      <header className="utility-database__header">
        <p className="utility-database__eyebrow">{t('utilityPoints')}</p>
        <h1>{t('utilityDatabase')}</h1>
      </header>

      <div className="utility-database__filter-toggle-row">
        <button
          type="button"
          className="utility-database__filter-toggle"
          aria-expanded={filtersOpen}
          aria-controls="utility-database-filters"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <span aria-hidden="true">{filtersOpen ? '−' : '+'}</span>
          {filtersOpen ? t('hideFilters') : t('showFilters')}
        </button>
      </div>

      {filtersOpen && (
        <section id="utility-database-filters" className="utility-database__filters" aria-label={t('utilityDatabase')}>
        <div className="utility-database__search-group">
          <label className="utility-database__search">
            <span>{t('searchUtilityDatabase')}</span>
            <input
              type="search"
              value={pointSearch}
              onChange={(event) => setPointSearch(event.target.value)}
              placeholder={t('pointNamePlaceholder')}
            />
          </label>
          <fieldset className="utility-database__filter utility-database__favorites">
            <legend>{t('favorites')}</legend>
            <label className="utility-database__checkbox">
              <input
                type="checkbox"
                checked={bookmarksOnly}
                onChange={(event) => setBookmarksOnly(event.target.checked)}
              />
              <span>{t('showBookmarkedOnly')}</span>
            </label>
          </fieldset>
        </div>

        <div className="utility-database__filter">
          <div className="utility-database__filter-heading">
            <h2>{t('maps')}</h2>
            <span>{selectedMapIds.length} / {maps.length}</span>
          </div>
          <input
            className="utility-database__map-search"
            type="search"
            value={mapSearch}
            onChange={(event) => setMapSearch(event.target.value)}
            placeholder={t('selectMap')}
            aria-label={t('selectMap')}
          />
          <div className="utility-database__checklist">
            {visibleMaps.map((map) => {
              const mapId = String(map.id);
              return (
                <label key={mapId} className="utility-database__checkbox">
                  <input
                    type="checkbox"
                    checked={selectedMapIds.includes(mapId)}
                    onChange={() => toggleMap(mapId)}
                  />
                  <span>{map.name}</span>
                </label>
              );
            })}
          </div>
          <div className="utility-database__actions">
            <button type="button" onClick={() => setSelectedMapIds(maps.map((map) => String(map.id)))}>
              {t('all')}
            </button>
            <button type="button" onClick={() => setSelectedMapIds([])}>
              {t('none')}
            </button>
          </div>
        </div>

        <fieldset className="utility-database__filter utility-database__types">
          <legend>{t('utilityType')}</legend>
          {utilityTypes.map((type) => (
            <label key={type} className="utility-database__checkbox">
              <input
                type="checkbox"
                checked={selectedTypes.includes(type)}
                onChange={() => toggleType(type)}
              />
              <span>{getTypeLabel(type)}</span>
            </label>
          ))}
          <div className="utility-database__actions">
            <button type="button" onClick={() => setSelectedTypes(utilityTypes)}>
              {t('all')}
            </button>
            <button type="button" onClick={() => setSelectedTypes([])}>
              {t('none')}
            </button>
          </div>
        </fieldset>
        </section>
      )}

      {bookmarkError && (
        <p className="utility-database__message utility-database__message--error" role="alert">
          {t('bookmarkSaveError')}
        </p>
      )}

      <section className="utility-database__results" aria-live="polite">
        <div className="utility-database__results-heading">
          <h2>{t('utilityPoints')}</h2>
          <span>{filteredPoints.length}</span>
        </div>

        {loadingMaps || loadingPoints ? (
          <p className="utility-database__message">{t('loadingMaps')}</p>
        ) : loadError ? (
          <p className="utility-database__message utility-database__message--error" role="alert">
            {t('databaseLoadError')}
          </p>
        ) : !selectedMapIds.length ? (
          <p className="utility-database__message">{t('selectMapsToBrowse')}</p>
        ) : filteredPoints.length === 0 ? (
          <p className="utility-database__message">{t('noUtilitiesMatch')}</p>
        ) : (
          <div className="utility-database__list">
            {filteredPoints.map(({ point, category }) => {
                const isVideo = videoExtensions.test(point.video_url || point.image_url || '');
                const videoUrl = point.video_url || (isVideo ? point.image_url : null);
                return (
                <article key={`${point.map_id}-${point.id}`} className="utility-database__item">
                  <div className="utility-database__item-main">
                    <div className="utility-database__item-heading">
                      <h3>{point.name || t('unknown')}</h3>
                      <div className="utility-database__item-actions">
                        <span className={`utility-database__badge utility-database__badge--${category}`}>
                          {getTypeLabel(category)}
                        </span>
                        <button
                          type="button"
                          className={`utility-database__bookmark${bookmarkedKeys.has(getBookmarkKey(point)) ? ' is-active' : ''}`}
                          aria-label={bookmarkedKeys.has(getBookmarkKey(point)) ? t('bookmarked') : t('bookmark')}
                          aria-pressed={bookmarkedKeys.has(getBookmarkKey(point))}
                          title={bookmarkedKeys.has(getBookmarkKey(point)) ? t('bookmarked') : t('bookmark')}
                          onClick={() => toggleBookmark(point)}
                        >
                          <span aria-hidden="true">{bookmarkedKeys.has(getBookmarkKey(point)) ? '♥' : '♡'}</span>
                        </button>
                      </div>
                    </div>
                    <div className="utility-database__meta">
                      <Link to={`/map/${point.map_id}`}>{mapNames.get(String(point.map_id)) || t('unknownMap')}</Link>
                      <span>{getTeamLabel(point.team)}</span>
                      {point.suggested_by && (
                        <span>{t('suggestedByLabel')}: {point.suggested_by}</span>
                      )}
                    </div>
                    {videoUrl && /^https?:\/\//i.test(videoUrl) ? (
                      <div className="utility-database__links">
                        <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                          {t('openVideo')}
                        </a>
                        <Link className="utility-database__open-page" to={`/db/${point.map_id}/${point.id}`}>
                          {t('openPage')}
                        </Link>
                      </div>
                    ) : videoUrl ? (
                      <div className="utility-database__media-actions">
                        <video className="utility-database__media" src={getFileUrl(videoUrl)} controls preload="metadata" />
                        <Link className="utility-database__open-page" to={`/db/${point.map_id}/${point.id}`}>
                          {t('openPage')}
                        </Link>
                      </div>
                    ) : point.image_url ? (
                      <div className="utility-database__media-actions">
                        <img className="utility-database__media" src={getFileUrl(point.image_url)} alt={point.name || ''} loading="lazy" />
                        <Link className="utility-database__open-page" to={`/db/${point.map_id}/${point.id}`}>
                          {t('openPage')}
                        </Link>
                      </div>
                    ) : null}
                    {!videoUrl && !point.image_url && (
                      <div className="utility-database__links">
                        <Link className="utility-database__open-page" to={`/db/${point.map_id}/${point.id}`}>
                          {t('openPage')}
                        </Link>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default UtilityDatabase;
