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
 * Calcula a distância mínima entre uma posição e um GeoJSON (polígono, linha, etc)
 */
export function getDistanceToGeoJSON(
    position: Position,
    geoJSON: GeoJSONFeatureCollection
): number {
    let minDistance = Infinity;

    console.log(`   🧮 Calculando distância. Features:`, geoJSON.features?.length);

    for (const feature of geoJSON.features) {
        const geometryType = feature.geometry.type;
        
        if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
            const geometry = feature.geometry as any;
            let coordinates = geometry.coordinates;

            console.log(`   📐 Tipo: ${geometryType}, Coords length:`, coordinates?.length);

            // Para MultiPolygon, pegar o primeiro polígono
            if (geometryType === 'MultiPolygon') {
                coordinates = coordinates[0];
                console.log(`   📐 MultiPolygon -> Polygon, novo length:`, coordinates?.length);
            }

            const centroid = getCentroid(coordinates);
            console.log(`   🎯 Centroid calculado:`, centroid);
            
            if (centroid) {
                const distance = calculateDistance(
                    position.lat,
                    position.lng,
                    centroid.lat,
                    centroid.lng
                );
                console.log(`   📏 Distância calculada: ${Math.round(distance)}m`);
                minDistance = Math.min(minDistance, distance);
            }
        } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
            const geometry = feature.geometry as any;
            let coordinates = geometry.coordinates;

            console.log(`   📐 Tipo: ${geometryType}, Coords length:`, coordinates?.length);

            // Para MultiLineString, processar todas as linhas
            if (geometryType === 'MultiLineString') {
                for (const lineString of coordinates) {
                    const centroid = getCentroidFromLineString(lineString);
                    console.log(`   🎯 Centroid (LineString):`, centroid);
                    
                    if (centroid) {
                        const distance = calculateDistance(
                            position.lat,
                            position.lng,
                            centroid.lat,
                            centroid.lng
                        );
                        console.log(`   📏 Distância calculada: ${Math.round(distance)}m`);
                        minDistance = Math.min(minDistance, distance);
                    }
                }
            } else {
                // LineString simples
                const centroid = getCentroidFromLineString(coordinates);
                console.log(`   🎯 Centroid (LineString):`, centroid);
                
                if (centroid) {
                    const distance = calculateDistance(
                        position.lat,
                        position.lng,
                        centroid.lat,
                        centroid.lng
                    );
                    console.log(`   📏 Distância calculada: ${Math.round(distance)}m`);
                    minDistance = Math.min(minDistance, distance);
                }
            }
        }
    }

    console.log(`   ✅ Distância mínima final: ${minDistance === Infinity ? 'INFINITY' : Math.round(minDistance) + 'm'}`);
    return minDistance;
}

/**
 * Calcula o centróide de um LineString (array de pontos)
 */
function getCentroidFromLineString(points: [number, number][]): { lat: number; lng: number } | null {
    if (!points || points.length === 0) return null;
    
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

export interface NearbySector {
    operacao: string;
    cidade: string;
    cidadeId: string;
    setor: string;
    setorNome: string;
    distance: number;
}
