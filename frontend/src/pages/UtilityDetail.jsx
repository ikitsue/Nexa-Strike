import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getFileUrl, getFileUrlFallbacks, mapsAPI } from '../api/supabaseApi';
import { useCookieConsent } from '../../../shared/consent/CookieConsent';
import { useLanguage } from '../i18n';
import './UtilityDetail.css';

const videoExtensions = /\.(mp4|webm|mov|avi|mkv)$/i;

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

const getMetadata = (description = '') => {
  const metadata = {};
  const descriptionParts = [];

  String(description).split('|').map((part) => part.trim()).filter(Boolean).forEach((part) => {
    const [keyRaw, ...valueParts] = part.split(':');
    const key = String(keyRaw || '').trim().toLowerCase().replace(/\s+/g, '_');
    const value = valueParts.join(':').trim();

    if (['air_time', 'jump_throw', 'movement', 'mouse_button', 'difficulty', 'console_command'].includes(key)) {
      metadata[key] = value;
    } else if (key !== 'parent') {
      descriptionParts.push(part);
    }
  });

  return { metadata, description: descriptionParts.join(' | ').trim() };
};

const getParentId = (point) => {
  if (point.parent_id != null) return String(point.parent_id);
  return String(point.description || '').match(/parent:(\d+)/i)?.[1] || null;
};

const getCategory = (point, pointsById) => {
  let parent = pointsById.get(`${point.map_id}:${getParentId(point)}`);
  const visited = new Set();

  while (parent?.utility_type === 'line_group' && !visited.has(String(parent.id))) {
    visited.add(String(parent.id));
    parent = pointsById.get(`${parent.map_id}:${getParentId(parent)}`);
  }

  return parent?.utility_type || point.utility_type;
};

const getYouTubeEmbedUrl = (url) => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const videoId = hostname === 'youtu.be'
      ? parsedUrl.pathname.slice(1)
      : hostname === 'youtube.com' || hostname.endsWith('.youtube.com')
        ? parsedUrl.searchParams.get('v') || parsedUrl.pathname.match(/\/embed\/([^/]+)/)?.[1]
        : null;

    return videoId ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` : null;
  } catch {
    return null;
  }
};

const translateMetadataValue = (value, t) => {
  if (!value) return value;
  const normalizedValue = String(value).toLowerCase().replace(/[\s+]+/g, '_');
  const translationKey = metadataValueKeys[normalizedValue];
  return translationKey ? t(translationKey) : value;
};

const formatPointDate = (value, language) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(date);
};

const UtilityDetail = () => {
  const { mapId, pointId } = useParams();
  const { language, t } = useLanguage();
  const { preferences, openSettings } = useCookieConsent();
  const [map, setMap] = useState(null);
  const [point, setPoint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [bookmarked, setBookmarked] = useState(
    () => localStorage.getItem(`nexastrike-utility-bookmark-${mapId}-${pointId}`) === 'true',
  );
  const [actionMessage, setActionMessage] = useState('');
  const [youtubeIntroCompletedKey, setYoutubeIntroCompletedKey] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    setMap(null);
    setPoint(null);

    const loadUtility = async () => {
      try {
        const response = await mapsAPI.getById(mapId);
        if (cancelled) return;
        const mapData = response.data;
        const matchingPoint = (mapData.utility_points || []).find(
          (utilityPoint) => String(utilityPoint.id) === String(pointId),
        );
        setMap(mapData);
        setPoint(matchingPoint || null);
      } catch (error) {
        console.error('Failed to load utility detail:', error);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadUtility();
    return () => {
      cancelled = true;
    };
  }, [mapId, pointId]);

  useEffect(() => {
    setBookmarked(localStorage.getItem(`nexastrike-utility-bookmark-${mapId}-${pointId}`) === 'true');
    setActionMessage('');
  }, [mapId, pointId]);

  const pointsById = useMemo(
    () => new Map((map?.utility_points || []).map((utilityPoint) => [
      `${utilityPoint.map_id}:${utilityPoint.id}`,
      utilityPoint,
    ])),
    [map],
  );

  const videoUrl = point?.video_url || (videoExtensions.test(point?.image_url || '') ? point.image_url : null);
  const imageUrl = point?.image_url && !videoExtensions.test(point.image_url) ? point.image_url : null;
  const youtubeEmbedUrl = videoUrl && /^https?:\/\//i.test(videoUrl) ? getYouTubeEmbedUrl(videoUrl) : null;
  const youtubeIntroKey = youtubeEmbedUrl ? `${mapId}:${pointId}:${youtubeEmbedUrl}` : null;

  useEffect(() => {
    if (!youtubeIntroKey || !preferences.externalMedia) return undefined;
    const timeoutId = window.setTimeout(() => {
      setYoutubeIntroCompletedKey(youtubeIntroKey);
    }, 15000);
    return () => window.clearTimeout(timeoutId);
  }, [youtubeIntroKey, preferences.externalMedia]);

  if (loading) {
    return <main className="utility-detail"><p className="utility-detail__message">{t('loadingUtilityDetail')}</p></main>;
  }

  if (loadError) {
    return <main className="utility-detail"><p className="utility-detail__message utility-detail__message--error" role="alert">{t('detailLoadError')}</p></main>;
  }

  if (!map || !point) {
    return <main className="utility-detail"><p className="utility-detail__message">{t('utilityNotFound')}</p></main>;
  }

  const category = getCategory(point, pointsById);
  const parsed = getMetadata(point.description);
  const teamLabel = ['ct', 't'].includes(String(point.team || '').toLowerCase())
    ? String(point.team).toUpperCase()
    : t('allTeams');
  const showYoutubeIntro = Boolean(
    youtubeIntroKey
    && preferences.externalMedia
    && youtubeIntroCompletedKey !== youtubeIntroKey,
  );
  const values = [
    { key: 'mouse_button', label: t('mouseButton') },
    { key: 'air_time', label: t('airTime') },
    { key: 'jump_throw', label: t('jumpThrow') },
    { key: 'movement', label: t('movement') },
    { key: 'difficulty', label: t('difficultyLevel') },
    { key: 'console_command', label: t('consoleCommand') },
  ].filter((item) => parsed.metadata[item.key]);
  const createdAt = point.created_at ? formatPointDate(point.created_at, language) : null;
  const updatedAt = point.updated_at ? formatPointDate(point.updated_at, language) : null;

  const toggleBookmark = () => {
    const nextValue = !bookmarked;
    try {
      localStorage.setItem(`nexastrike-utility-bookmark-${mapId}-${pointId}`, String(nextValue));
      setBookmarked(nextValue);
      setActionMessage('');
    } catch (error) {
      console.error('Failed to save utility bookmark:', error);
      setActionMessage(t('bookmarkSaveError'));
    }
  };

  const shareUtility = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: point.name, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setActionMessage(t('linkCopied'));
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Failed to share utility:', error);
        setActionMessage(t('shareFailed'));
      }
    }
  };

  const renderImage = (url, alt = point.name || '') => (
    <img
      className="utility-detail__image"
      src={getFileUrl(url)}
      alt={alt}
      onError={(event) => {
        const fallback = getFileUrlFallbacks(url)[1];
        if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
      }}
    />
  );
  const lineZoomImages = point.utility_type === 'line'
    ? [
      { key: 'zoom_in', url: point.zoom_in_image_url },
      { key: 'zoom_out', url: point.zoom_out_image_url },
    ].filter((image) => image.url)
    : [];

  return (
    <main className="utility-detail">
      <div className="utility-detail__layout">
        <div className="utility-detail__main">
          <header className="utility-detail__heading">
            <h1>{point.name || t('unknown')}</h1>
            <Link
              className="utility-detail__report"
              to="/contact"
              state={{
                utilityReport: {
                  mapId: map.id,
                  mapName: map.name,
                  pointId: point.id,
                  pointName: point.name || t('unknown'),
                  utilityType: category,
                  team: teamLabel,
                },
              }}
            >
              {t('reportNade')}
            </Link>
          </header>

          <section className="utility-detail__media" aria-label={point.name || t('unknown')}>
            {youtubeEmbedUrl ? (
              preferences.externalMedia ? (
                showYoutubeIntro ? (
                  <div className="utility-detail__youtube-intro" role="status">
                    <strong>{t('youtubeHdIntroTitle')}</strong>
                    <p>{t('youtubeHdIntroMessage')}</p>
                    <span className="utility-detail__youtube-intro-progress" aria-hidden="true" />
                    <button
                      type="button"
                      className="utility-detail__youtube-intro-skip"
                      onClick={() => setYoutubeIntroCompletedKey(youtubeIntroKey)}
                    >
                      {t('youtubeHdIntroSkip')}
                    </button>
                  </div>
                ) : (
                  <iframe
                    src={`${youtubeEmbedUrl}?vq=hd1080`}
                    title={`${point.name} — YouTube`}
                    className="utility-detail__video utility-detail__video--embed"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="encrypted-media; picture-in-picture; fullscreen"
                  />
                )
              ) : (
                <div className="utility-detail__media-notice" role="note">
                  <p>{t('externalMediaVideoPrivacyNotice')}</p>
                  <button type="button" onClick={openSettings}>{t('chooseExternalMedia')}</button>
                </div>
              )
            ) : videoUrl && !/^https?:\/\//i.test(videoUrl) ? (
              <video className="utility-detail__video" src={getFileUrl(videoUrl)} controls preload="metadata" />
            ) : imageUrl ? (
              renderImage(imageUrl)
            ) : map.image_url ? (
              renderImage(map.image_url)
            ) : videoUrl ? (
              <a className="utility-detail__external-video" href={videoUrl} target="_blank" rel="noopener noreferrer">
                {t('openVideo')}
              </a>
            ) : (
              <div className="utility-detail__media-empty">{t('utilityMediaUnavailable')}</div>
            )}
          </section>

          {lineZoomImages.length > 0 && (
            <section className="utility-detail__zoom-gallery" aria-label={t('lineZoomImages')}>
              {lineZoomImages.map(({ key, url }) => {
                const label = t(key === 'zoom_in' ? 'lineZoomInImage' : 'lineZoomOutImage');
                return (
                  <figure className="utility-detail__zoom-item" key={key}>
                    <figcaption>{label}</figcaption>
                    {renderImage(url, `${point.name} - ${label}`)}
                  </figure>
                );
              })}
            </section>
          )}

          <div className="utility-detail__tags">
            <span className={`utility-detail__tag utility-detail__tag--${category}`}>{t(category === 'grenade' ? 'grenade' : category)}</span>
            <span className="utility-detail__tag utility-detail__tag--neutral">{teamLabel}</span>
            {point.suggested_by && <span className="utility-detail__tag utility-detail__tag--neutral">{t('suggestedByLabel')}: {point.suggested_by}</span>}
          </div>

        </div>

        <aside className="utility-detail__info">
          <div className="utility-detail__info-heading">
            <h2>{t('nadeInfo')}</h2>
            <button type="button" className="utility-detail__share" onClick={shareUtility}>{t('share')}</button>
          </div>
          <button
            type="button"
            className={`utility-detail__bookmark${bookmarked ? ' is-active' : ''}`}
            onClick={toggleBookmark}
            aria-pressed={bookmarked}
          >
            {bookmarked ? t('bookmarked') : t('bookmark')}
          </button>
          {actionMessage && <p className="utility-detail__action-message" role="status">{actionMessage}</p>}

          <div className="utility-detail__metadata">
            {values.map(({ key, label }) => (
              <div className="utility-detail__metadata-item" key={key}>
                <span>{label}</span>
                <strong>{key === 'console_command' ? parsed.metadata[key] : translateMetadataValue(parsed.metadata[key], t)}</strong>
              </div>
            ))}
          </div>

          {(createdAt || updatedAt) && (
            <div className="utility-detail__dates">
              {createdAt && (
                <p><span>{t('createdAt')}</span>{createdAt}</p>
              )}
              {updatedAt && (
                <p><span>{t('updatedAt')}</span>{updatedAt}</p>
              )}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
};

export default UtilityDetail;
