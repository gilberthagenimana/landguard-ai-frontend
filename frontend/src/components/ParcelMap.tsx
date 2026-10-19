import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type ParcelMapLocation = {
  verificationStatus?: string
  latitude?: number | null
  longitude?: number | null
  geometry?: unknown
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

export default function ParcelMap({ location }: { location: ParcelMapLocation }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  const isVerified = location.verificationStatus === 'VERIFIED'
  const hasPoint = isVerified && validPoint(location.latitude, location.longitude)
  const hasGeometry = isVerified && validGeoJson(location.geometry)

  useEffect(() => {
    if (!containerRef.current || (!hasPoint && !hasGeometry)) return

    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true })
    mapRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    const layers = L.layerGroup().addTo(map)
    layerRef.current = layers
    const bounds = L.latLngBounds([])

    if (hasPoint) {
      const marker = L.marker([location.latitude as number, location.longitude as number]).bindPopup('Recorded parcel location')
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
    else map.setView([0, 0], 2)

    return () => {
      layerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [hasGeometry, hasPoint, location.geometry, location.latitude, location.longitude])

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

  if (!hasPoint && !hasGeometry) {
    return <div className="parcel-map-empty"><MapPinIcon /><strong>Parcel location is not available</strong><span>{isVerified ? 'The verified parcel record has no usable coordinates or cadastral boundary geometry.' : 'Location data is absent or still pending verification.'}</span><small>Only location data approved by an Administrator and obtained from an authorized source is displayed.</small></div>
  }

  return <div className="parcel-map-shell"><div ref={containerRef} className="parcel-leaflet-map" /><div className="parcel-map-toolbar"><span><i className="map-legend-dot" /> Recorded location {hasGeometry && <><i className="map-legend-boundary" /> Verified boundary</>}</span><button type="button" className="btn-secondary btn-sm" onClick={fitToParcel}>Fit to parcel</button></div></div>
}

function MapPinIcon() {
  return <svg className="parcel-map-empty-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.2 7-12A7 7 0 0 0 5 9c0 5.8 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></svg>
}
