import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type ParcelMapLocation = {
  verificationStatus?: string
  latitude?: number | null
  longitude?: number | null
  geometry?: unknown
  upi?: string | null
  parcelCode?: string
  address?: string
  district?: string
  sector?: string
  cell?: string
  pending?: boolean
  preview?: boolean
}

function validPoint(latitude: unknown, longitude: unknown): latitude is number {
  return typeof latitude === 'number' && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && typeof longitude === 'number' && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
}

function validGeoJson(geometry: unknown): geometry is GeoJSON.GeoJsonObject {
  if (!geometry || typeof geometry !== 'object') return false
  const candidate = geometry as { type?: unknown; coordinates?: unknown; features?: unknown }
  return typeof candidate.type === 'string'
    && ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon', 'Feature', 'FeatureCollection'].includes(candidate.type)
    && ('coordinates' in candidate || 'features' in candidate)
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[character] || character))
}

export default function ParcelMap({ location }: { location: ParcelMapLocation }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const [approximatePoint, setApproximatePoint] = useState<[number, number] | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [tileError, setTileError] = useState(false)
  const isVerified = location.verificationStatus === 'VERIFIED' || location.preview === true
  const hasPoint = isVerified && validPoint(location.latitude, location.longitude)
  const hasGeometry = isVerified && validGeoJson(location.geometry)
  const hasApproximatePoint = !hasPoint && !hasGeometry && Boolean(approximatePoint)

  useEffect(() => {
    if (hasPoint || hasGeometry || !location.address) {
      setApproximatePoint(null)
      setLookingUp(false)
      return
    }

    const controller = new AbortController()
    setLookingUp(true)
    const query = encodeURIComponent(location.address)
    fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=rw&q=${query}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'Accept-Language': 'en' },
    })
      .then((response) => {
        if (!response.ok) throw new Error('Administrative location lookup failed')
        return response.json() as Promise<Array<{ lat?: string; lon?: string }>>
      })
      .then((results) => {
        const latitude = Number(results[0]?.lat)
        const longitude = Number(results[0]?.lon)
        setApproximatePoint(validPoint(latitude, longitude) ? [latitude, longitude] : null)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setApproximatePoint(null)
      })
      .finally(() => setLookingUp(false))

    return () => controller.abort()
  }, [hasGeometry, hasPoint, location.address])

  useEffect(() => {
    if (!containerRef.current) return

    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true })
    mapRef.current = map
    setTileError(false)
    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    })
    street.on('tileerror', () => setTileError(true))
    street.addTo(map)
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19,
    })
    L.control.layers({ 'Street map': street, Satellite: satellite }, {}).addTo(map)

    const layers = L.layerGroup().addTo(map)
    layerRef.current = layers
    const bounds = L.latLngBounds([])

    if (hasPoint) {
      const marker = L.marker([location.latitude as number, location.longitude as number]).bindPopup(
        `<strong>${escapeHtml(location.upi || 'Parcel')}</strong><br />${escapeHtml(location.parcelCode || '')}`,
      )
      marker.addTo(layers)
      bounds.extend(marker.getLatLng())
    }
    if (hasApproximatePoint && approximatePoint) {
      const marker = L.marker(approximatePoint).bindPopup(
        `<strong>${escapeHtml(location.upi || 'Parcel')}</strong><br />${escapeHtml(location.parcelCode || '')}<br />${escapeHtml(location.district || '')} / ${escapeHtml(location.sector || '')} / ${escapeHtml(location.cell || '')}<br /><em>Approximate administrative location, not the exact parcel boundary.</em>`,
      )
      marker.addTo(layers)
      bounds.extend(marker.getLatLng())
    }
    if (hasGeometry) {
      const geometryLayer = L.geoJSON(location.geometry as GeoJSON.GeoJsonObject, {
        style: { color: '#087fe0', weight: 2, fillColor: '#2d9bf0', fillOpacity: 0.2 },
      }).addTo(layers)
      bounds.extend(geometryLayer.getBounds())
    }
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24] })
    else map.setView([-1.9403, 29.8739], 8)

    return () => {
      layerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [approximatePoint, hasApproximatePoint, hasGeometry, hasPoint, location.geometry, location.latitude, location.longitude, location.parcelCode, location.upi, location.district, location.sector, location.cell])

  const fitToParcel = () => {
    const map = mapRef.current
    const layers = layerRef.current
    if (!map || !layers) return
    const bounds = L.latLngBounds([])
    layers.eachLayer((layer) => {
      if (layer instanceof L.Marker) bounds.extend(layer.getLatLng())
      if (layer instanceof L.GeoJSON) bounds.extend(layer.getBounds())
    })
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24] })
  }

  const locationMessage = lookingUp
    ? 'Locating administrative area…'
    : location.pending
      ? 'Location pending verification'
      : 'Parcel location is not available'
  const locationDetail = lookingUp
    ? 'Searching OpenStreetMap for the recorded Rwanda administrative location.'
    : location.pending
      ? 'Submitted exact coordinates or boundary data is awaiting Administrator approval.'
      : 'No exact or approximate location data is available for this parcel.'

  return <div className="parcel-map-shell">
    <div ref={containerRef} className="parcel-leaflet-map" />
    {tileError && <div className="parcel-map-error"><strong>Map tiles could not be loaded.</strong><span>Check your internet connection or try again.</span></div>}
    {!hasPoint && !hasGeometry && !hasApproximatePoint && <div className="parcel-map-status"><MapPinIcon /><strong>{locationMessage}</strong><span>{locationDetail}</span><small>Only verified coordinates or authoritative geometry are exact. Administrative lookup results are approximate.</small></div>}
    <div className="parcel-map-toolbar"><span><i className="map-legend-dot" /> {hasApproximatePoint ? 'Approximate administrative location' : hasPoint || hasGeometry ? (location.preview ? 'Unverified submission preview' : 'Verified location') : 'Rwanda overview'} {hasGeometry && <><i className="map-legend-boundary" /> {location.preview ? 'Submitted boundary' : 'Verified boundary'}</>}</span><button type="button" className="btn-secondary btn-sm" onClick={fitToParcel}>Fit to parcel</button></div>
  </div>
}

function MapPinIcon() {
  return <svg className="parcel-map-empty-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.2 7-12A7 7 0 0 0 5 9c0 5.8 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></svg>
}
