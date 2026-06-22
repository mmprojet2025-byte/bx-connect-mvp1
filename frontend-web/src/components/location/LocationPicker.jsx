import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import AppIcon from '../ui/AppIcons';
import { useTranslation } from 'react-i18next';

const BRUSSELS_CENTER = [50.8466, 4.3528];
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';

export default function LocationPicker({
  address,
  commune,
  latitude,
  longitude,
  onCoordinatesChange,
}) {
  const { t, i18n } = useTranslation();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onCoordinatesChangeRef = useRef(onCoordinatesChange);
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const numericLatitude = parseCoordinate(latitude);
  const numericLongitude = parseCoordinate(longitude);
  const hasCoordinates = Number.isFinite(numericLatitude) && Number.isFinite(numericLongitude);

  useEffect(() => {
    onCoordinatesChangeRef.current = onCoordinatesChange;
  }, [onCoordinatesChange]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return undefined;

    const map = L.map(mapContainerRef.current, {
      scrollWheelZoom: false,
      attributionControl: true,
    }).setView(hasCoordinates ? [numericLatitude, numericLongitude] : BRUSSELS_CENTER, hasCoordinates ? 15 : 11);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    map.on('click', event => {
      const nextLatitude = formatCoordinate(event.latlng.lat);
      const nextLongitude = formatCoordinate(event.latlng.lng);
      onCoordinatesChangeRef.current(nextLatitude, nextLongitude);
      setStatus('success');
      setMessage(t('location.coordinatesSelected'));
    });

    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!hasCoordinates) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    const coordinates = [numericLatitude, numericLongitude];
    if (!markerRef.current) {
      markerRef.current = L.marker(coordinates, {
        icon: L.divIcon({
          className: '',
          html: '<span style="display:block;width:18px;height:18px;border-radius:999px;background:#1d4ed8;border:3px solid white;box-shadow:0 8px 20px rgba(15,23,42,.25)"></span>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      }).addTo(map);
    } else {
      markerRef.current.setLatLng(coordinates);
    }
    map.setView(coordinates, Math.max(map.getZoom(), 14));
    setTimeout(() => map.invalidateSize(), 0);
  }, [hasCoordinates, numericLatitude, numericLongitude]);

  const handleFindCoordinates = async () => {
    const query = [address, commune].filter(Boolean).join(', ').trim();
    if (!query) {
      setStatus('error');
      setMessage(t('location.enterAddressOrCommune'));
      return;
    }

    setStatus('loading');
    setMessage(t('location.searchingCoordinates'));

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        limit: '1',
        addressdetails: '0',
        'accept-language': i18n.language || 'fr-BE',
      });
      const response = await fetch(`${NOMINATIM_ENDPOINT}?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Nominatim unavailable');
      }

      const results = await response.json();
      const firstResult = Array.isArray(results) ? results[0] : null;
      if (!firstResult?.lat || !firstResult?.lon) {
        setStatus('error');
        setMessage(t('location.addressNotFound'));
        return;
      }

      onCoordinatesChangeRef.current(formatCoordinate(firstResult.lat), formatCoordinate(firstResult.lon));
      setStatus('success');
      setMessage(t('location.coordinatesFound'));
    } catch {
      setStatus('error');
      setMessage(t('location.serviceUnavailable'));
    }
  };

  return (
    <div className="md:col-span-2 rounded-2xl border border-blue-100 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
            <AppIcon name="MapPin" className="h-4 w-4 text-blue-700" />
            {t('location.title')}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {t('location.helper')}
          </p>
        </div>
        <button
          type="button"
          onClick={handleFindCoordinates}
          disabled={status === 'loading'}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-black text-white transition hover:bg-blue-600 disabled:opacity-60"
        >
          <AppIcon name="Search" className="h-3.5 w-3.5" />
          {status === 'loading' ? t('location.searching') : t('location.findCoordinates')}
        </button>
      </div>

      {message && (
        <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${
          status === 'error' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'
        }`}>
          {message}
        </div>
      )}

      <div
        ref={mapContainerRef}
        className="mt-3 h-56 overflow-hidden rounded-xl border border-slate-200 bg-white"
        aria-label={t('location.mapAria')}
      />
    </div>
  );
}

function parseCoordinate(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(7) : '';
}
