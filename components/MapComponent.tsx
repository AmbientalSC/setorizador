import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Polyline, useMap } from 'react-leaflet';
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

export const MapComponent: React.FC<MapComponentProps> = ({ userPosition, positionHistory, sectorGeoJSON }) => {
    const geoJsonRef = useRef<L.GeoJSON | null>(null);

    // Using key on GeoJSON component to force re-render when data changes.
    // This is a standard React pattern to handle components that don't internally react to prop changes.
    const geoJsonKey = sectorGeoJSON ? JSON.stringify(sectorGeoJSON.features[0]?.properties) : 'no-data';

    return (
        <MapContainer center={[-14.235, -51.925]} zoom={4} scrollWheelZoom={true} className="h-full w-full z-0" zoomControl={false}>
            <MapSizeFixer />
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* GPS Trail - Green polyline showing device path */}
            {positionHistory.length > 1 && (
                <Polyline
                    positions={positionHistory.map(pos => [pos.lat, pos.lng])}
                    pathOptions={{
                        color: '#00ff00',
                        weight: 4,
                        opacity: 0.8,
                    }}
                />
            )}
            {userPosition && (
                <Marker position={[userPosition.lat, userPosition.lng]} icon={userIcon}>
                    <Popup>
                        Your current location.
                    </Popup>
                </Marker>
            )}
            {sectorGeoJSON && (
                <>
                    <GeoJSON
                        key={geoJsonKey}
                        data={sectorGeoJSON}
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
        </MapContainer>
    );
};