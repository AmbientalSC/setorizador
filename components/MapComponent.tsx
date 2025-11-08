import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Polyline, useMap, useMapEvents } from 'react-leaflet';
import type { Map } from 'leaflet';
import L from 'leaflet';
import type { GeoJSONFeatureCollection } from '../types';

// Component to fix map size on mount
const MapSizeFixer: React.FC = () => {
    const map = useMap();
    useEffect(() => {
        // Fix map size after mount
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 100);

        // Create custom panes for proper z-ordering: sector (below) and trail (above)
        try {
            if (!map.getPane('sectorPane')) {
                map.createPane('sectorPane');
                const p = map.getPane('sectorPane');
                if (p) p.style.zIndex = '400';
            }
            if (!map.getPane('trailPane')) {
                map.createPane('trailPane');
                const p2 = map.getPane('trailPane');
                if (p2) p2.style.zIndex = '650';
            }
        } catch (e) {
            // ignore if panes already exist or not supported
        }
        return () => clearTimeout(timer);
    }, [map]);
    return null;
};

// Helper component to update map bounds
const FitBounds: React.FC<{ geoJSON: GeoJSONFeatureCollection | null }> = ({ geoJSON }) => {
    const map = useMap();
    useEffect(() => {
        if (geoJSON && geoJSON.features.length > 0) {
            const geoJsonLayer = L.geoJSON(geoJSON);
            const bounds = geoJsonLayer.getBounds();
            if (bounds.isValid()) {
                // Invalidate size to fix rendering issues
                setTimeout(() => {
                    map.invalidateSize();
                    map.fitBounds(bounds, { padding: [50, 50] });
                }, 100);
            }
        }
    }, [geoJSON, map]);
    return null;
};


interface MapComponentProps {
    userPosition: { lat: number; lng: number } | null;
    positionHistory: { lat: number; lng: number }[];
    sectorGeoJSON: GeoJSONFeatureCollection | null;
    // optional debug support: click handler and debug trail points
    onMapClick?: (lat: number, lng: number) => void;
    debugTrail?: { lat: number; lng: number }[];
    debugMode?: boolean;
}

const userIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    shadowSize: [41, 41]
});

export const MapComponent: React.FC<MapComponentProps> = ({ userPosition, positionHistory, sectorGeoJSON, onMapClick, debugTrail = [], debugMode = false }) => {
    const geoJsonRef = useRef<L.GeoJSON | null>(null);

    // Using key on GeoJSON component to force re-render when data changes.
    // This is a standard React pattern to handle components that don't internally react to prop changes.
    const geoJsonKey = sectorGeoJSON ? JSON.stringify(sectorGeoJSON.features[0]?.properties) : 'no-data';

    // Helper: component that listens to map clicks and forwards them via onMapClick
    const MapClickHandler: React.FC = () => {
        useMapEvents({
            click(e) {
                if (onMapClick && debugMode) {
                    const { lat, lng } = e.latlng;
                    onMapClick(lat, lng);
                }
            }
        });
        return null;
    };

    // Create arrow markers for a given position list (returns array of Marker nodes)
    const createArrowsFor = (positions: { lat: number; lng: number }[], prefix = 'a') => {
        if (!positions || positions.length < 2) return null;
        const toRad = (d: number) => d * Math.PI / 180;
        const toDeg = (r: number) => r * 180 / Math.PI;
        const bearing = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
            const lat1 = toRad(a.lat);
            const lat2 = toRad(b.lat);
            const dLon = toRad(b.lng - a.lng);
            const y = Math.sin(dLon) * Math.cos(lat2);
            const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
            let brng = Math.atan2(y, x);
            brng = toDeg(brng);
            return (brng + 360) % 360;
        };

        const arrows: React.ReactNode[] = [];
            for (let i = 0; i < positions.length - 1; i++) {
            const p1 = positions[i];
            const p2 = positions[i + 1];
            const midLat = (p1.lat + p2.lat) / 2;
            const midLng = (p1.lng + p2.lng) / 2;
                    const angle = bearing(p1, p2);
                    // Arrow SVG defaults pointing to the right (east). The bearing function
                    // returns degrees clockwise from north, so convert to CSS rotation (0 = east)
                    // by subtracting 90 degrees.
                    const rotated = angle - 90;
                    const size = 28; // larger arrow for better visibility
                    const strokeWidth = 3;
                    const svg = encodeURIComponent(`\n                        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='${size}' height='${size}'>\n                          <path d='M2 12 L16 12 M12 8 L16 12 L12 16' stroke='#00ff00' stroke-width='${strokeWidth}' fill='none' stroke-linecap='round' stroke-linejoin='round' />\n                        </svg>\n                    `);
                    const html = `<div style="transform: rotate(${rotated}deg); transform-origin: center center; width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center;">` +
                `<img src="data:image/svg+xml;utf8,${svg}" style="width:${size}px; height:${size}px; display:block;"/>` +
                `</div>`;
            const icon = L.divIcon({ html, className: 'trail-arrow-icon', iconSize: [size, size], iconAnchor: [Math.round(size/2), Math.round(size/2)] });
            arrows.push(
                <Marker key={`${prefix}-arrow-${i}`} position={[midLat, midLng]} icon={icon} interactive={false} zIndexOffset={1000} pane="trailPane" />
            );
        }
        return arrows;
    };

    const historyArrows = useMemo(() => createArrowsFor(positionHistory, 'hist'), [positionHistory]);
    const debugArrows = useMemo(() => createArrowsFor(debugTrail, 'dbg'), [debugTrail]);

    return (
        <MapContainer center={[-14.235, -51.925]} zoom={4} scrollWheelZoom={true} className="h-full w-full z-0" zoomControl={false}>
            <MapSizeFixer />
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Render map click handler only when debug mode is active */}
            {onMapClick && debugMode && <MapClickHandler />}
            {/* sector GeoJSON will render below */}
            {sectorGeoJSON && (
                <>
                    <GeoJSON
                        key={geoJsonKey}
                        data={sectorGeoJSON}
                        pane="sectorPane"
                        ref={geoJsonRef}
                        style={() => ({
                            color: '#ff0000',
                            weight: 3,
                            opacity: 0.8,
                        })}
                        onEachFeature={(feature, layer) => {
                            const properties = feature.properties;
                            let popupContent = '<div class="space-y-1">';
                            for (const key in properties) {
                                popupContent += `<strong>${key}:</strong> ${properties[key]}<br/>`;
                            }
                            popupContent += '</div>'
                            layer.bindPopup(popupContent);
                        }}
                    />
                    <FitBounds geoJSON={sectorGeoJSON} />
                </>
            )}

            {/* Render GPS trail and direction arrows AFTER GeoJSON so they appear on top */}
            {positionHistory.length > 1 && (
                <Polyline
                    pane="trailPane"
                    positions={positionHistory.map(pos => [pos.lat, pos.lng])}
                    pathOptions={{
                        color: '#00ff00',
                        weight: 4,
                        opacity: 0.9,
                    }}
                />
            )}

            {/* Debug trail (created by clicking on the map) */}
            {debugTrail && debugTrail.length > 1 && (
                <Polyline
                    pane="trailPane"
                    positions={debugTrail.map(pos => [pos.lat, pos.lng])}
                    pathOptions={{
                        color: '#00ff00',
                        weight: 4,
                        opacity: 0.9,
                        dashArray: '6 4'
                    }}
                />
            )}

            {userPosition && (
                <Marker position={[userPosition.lat, userPosition.lng]} icon={userIcon} pane="trailPane">
                    <Popup>
                        Your current location.
                    </Popup>
                </Marker>
            )}

            {/* Direction arrows along the trail: create small rotated SVG icons at midpoints */}
            {/* Arrows for real position history and debug trail */}
            {historyArrows}
            {debugArrows}
        </MapContainer>
    );
};