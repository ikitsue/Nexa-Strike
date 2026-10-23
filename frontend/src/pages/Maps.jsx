import React, { useState, useEffect } from 'react';
import { getFileUrl, getFileUrlFallbacks, mapsAPI } from '../api/supabaseApi';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n';
import './Home.css';

const Maps = () => {
  const { t } = useLanguage();
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const handleMapImageError = (event, imagePath) => {
    const image = event.currentTarget;
    const fallbackUrls = getFileUrlFallbacks(imagePath)
      .filter((url, index, urls) => url && url !== getFileUrl(imagePath) && urls.indexOf(url) === index);
    const nextIndex = Number(image.dataset.fallbackIndex || 0);
    if (fallbackUrls[nextIndex]) {
      image.dataset.fallbackIndex = String(nextIndex + 1);
      image.src = fallbackUrls[nextIndex];
    }
  };

  // Maps du pool officiel
  const mapPool = ['ancient', 'anubis', 'dust ii', 'inferno', 'cache', 'nuke', 'mirage'];
  const ancientSeasonMapNames = ['stronghold', 'warden', 'alpine', 'sanctum wingman'];
  const wingmanMapNames = ['el dorado wingman', 'debris wingman'];

  useEffect(() => {
    const fetchMaps = async () => {
      try {
        const response = await mapsAPI.getAll();
        setMaps(response.data);
      } catch (error) {
        console.error('Error fetching maps:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMaps();
  }, []);

  if (loading) return <div className="loading">{t('loadingMaps')}</div>;

  // Séparer les maps par catégorie (comparaison insensible à la casse)
  const officialMaps = maps.filter(map => mapPool.includes(map.name.toLowerCase()));
  const premiereModMaps = maps.filter(map => {
    const name = map.name.toLowerCase();
    const cat = (map.category || '').toLowerCase();
    const isPremierCategory = !map.category || ['premier mod', 'mode competitive', 'competitive mode'].includes(cat);
    return !mapPool.includes(name) && !ancientSeasonMapNames.includes(name) && !wingmanMapNames.includes(name) && isPremierCategory;
  });
  const wingmanMaps = maps.filter(map => (map.category === 'Wingman' || wingmanMapNames.includes(map.name.toLowerCase())) && !ancientSeasonMapNames.includes(map.name.toLowerCase()));
  const ancientSeasonMaps = maps.filter(map => ancientSeasonMapNames.includes(map.name.toLowerCase()) || map.category === 'Map des ancien saison');
  const avvenirMaps = maps.filter(map => map.category === 'À venir');

  return (
    <div className="home">
      <div className="home-header">
        <h1>{t('maps')}</h1>
      </div>
      
      {/* Map Pool */}
      <section className="maps-section">
        <h2 className="section-title">{t('mapPool')}</h2>
        <div className="maps-grid">
          {officialMaps.map((map) => (
            <Link key={map.id} to={`/map/${map.id}`} className="map-card">
              {map.image_url && (
                <img 
                  src={getFileUrl(map.image_url)}
                  alt={map.name}
                  className="map-card-image"
                  onError={(event) => handleMapImageError(event, map.image_url)}
                />
              )}
              <div className="map-card-content">
                <h2>{map.name}</h2>
                <p>{t('exploreUtilities')}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Premier Mod */}
      {premiereModMaps.length > 0 && (
        <section className="maps-section">
          <h2 className="section-title">{t('premierMod')}</h2>
          <div className="maps-grid">
            {premiereModMaps.map((map) => (
              <Link key={map.id} to={`/map/${map.id}`} className="map-card">
                {map.image_url && (
                  <img 
                    src={getFileUrl(map.image_url)}
                    alt={map.name}
                    className="map-card-image"
                    onError={(event) => handleMapImageError(event, map.image_url)}
                  />
                )}
                <div className="map-card-content">
                  <h2>{map.name}</h2>
                  <p>{t('exploreUtilities')}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Wingman */}
      {wingmanMaps.length > 0 && (
        <section className="maps-section">
          <h2 className="section-title">{t('wingman')}</h2>
          <div className="maps-grid">
            {wingmanMaps.map((map) => (
              <Link key={map.id} to={`/map/${map.id}`} className="map-card">
                {map.image_url && (
                  <img 
                    src={getFileUrl(map.image_url)}
                    alt={map.name}
                    className="map-card-image"
                    onError={(event) => handleMapImageError(event, map.image_url)}
                  />
                )}
                <div className="map-card-content">
                  <h2>{map.name}</h2>
                  <p>{t('exploreUtilities')}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Map des encient saison */}
      {ancientSeasonMaps.length > 0 && (
        <section className="maps-section">
          <h2 className="section-title">{t('ancientSeason')}</h2>
          <div className="maps-grid">
            {ancientSeasonMaps.map((map) => (
              <Link key={map.id} to={`/map/${map.id}`} className="map-card">
                {map.image_url && (
                  <img 
                    src={getFileUrl(map.image_url)}
                    alt={map.name}
                    className="map-card-image"
                    onError={(event) => handleMapImageError(event, map.image_url)}
                  />
                )}
                <div className="map-card-content">
                  <h2>{map.name}</h2>
                  <p>{t('exploreUtilities')}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* À venir */}
      {avvenirMaps.length > 0 && (
        <section className="maps-section">
          <h2 className="section-title">{t('comingSoon')}</h2>
          <div className="maps-grid">
            {avvenirMaps.map((map) => (
              <Link key={map.id} to={`/map/${map.id}`} className="map-card">
                {map.image_url && (
                  <img 
                    src={getFileUrl(map.image_url)}
                    alt={map.name}
                    className="map-card-image"
                    onError={(event) => handleMapImageError(event, map.image_url)}
                  />
                )}
                <div className="map-card-content">
                  <h2>{map.name}</h2>
                  <p>{t('exploreUtilities')}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Maps;
