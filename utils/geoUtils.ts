import type { GeoJSONFeatureCollection } from '../types';

interface Position {
    lat: number;
    lng: number;
}

/**
 * Calcula a distância entre dois pontos usando a fórmula de Haversine
 * @param lat1 Latitude do ponto 1
 * @param lon1 Longitude do ponto 1
 * @param lat2 Latitude do ponto 2
 * @param lon2 Longitude do ponto 2
 * @returns Distância em metros
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Extrai o centro (centróide) de um polígono ou multipolígono
 */
function getCentroid(coordinates: any[]): { lat: number; lng: number } | null {
    // Para Polygon
    if (coordinates[0] && Array.isArray(coordinates[0])) {
        const points = coordinates[0] as [number, number][];
        let lat = 0;
        let lng = 0;
        points.forEach(([lon, latCoord]) => {
            lng += lon;
            lat += latCoord;
        });
        return {
            lat: lat / points.length,
            lng: lng / points.length,
        };
    }
    return null;
}

/**
 * Calcula a distância mínima entre uma posição e um GeoJSON (polígono)
 */
export function getDistanceToGeoJSON(
    position: Position,
    geoJSON: GeoJSONFeatureCollection
): number {
    let minDistance = Infinity;

    for (const feature of geoJSON.features) {
        if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
            const geometry = feature.geometry as any;
            let coordinates = geometry.coordinates;

            // Para MultiPolygon, pegar o primeiro polígono
            if (feature.geometry.type === 'MultiPolygon') {
                coordinates = coordinates[0];
            }

            const centroid = getCentroid(coordinates);
            if (centroid) {
                const distance = calculateDistance(
                    position.lat,
                    position.lng,
                    centroid.lat,
                    centroid.lng
                );
                minDistance = Math.min(minDistance, distance);
            }
        }
    }

    return minDistance;
}

export interface NearbySector {
    operacao: string;
    cidade: string;
    cidadeId: string;
    setor: string;
    setorNome: string;
    distance: number;
}
