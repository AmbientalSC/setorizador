
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import type { City, Sector, GeoJSONFeatureCollection, GeoJSONFeature, GeoJSONProperties } from '../types';
import { getDistanceToGeoJSON, type NearbySector } from '../utils/geoUtils';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCO9UN0geTTGjwiMYEhnUo5WJr7evuN2_g",
    authDomain: "setor-mapa.firebaseapp.com",
    projectId: "setor-mapa",
    storageBucket: "setor-mapa.firebasestorage.app",
    messagingSenderId: "914753512067",
    appId: "1:914753512067:web:0ec2b4bb84aec9f00cb1b6"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Utility to simulate network delay (optional, remove in production)
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// --- FIRESTORE API ---

export const getOperacoes = async (): Promise<string[]> => {
    return ['domiciliar', 'seletiva', 'volumosos'];
};

export const getCitiesByOperacao = async (operacao: string): Promise<City[]> => {
    await delay(300);
    const citiesRef = collection(db, 'operacoes', operacao, 'cidades');
    const snapshot = await getDocs(citiesRef);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        nome: (doc.data() as { nome: string }).nome,
    }));
};

export const getSectorsByOperacaoAndCity = async (operacao: string, cityId: string): Promise<Sector[]> => {
    await delay(200);
    const cityDoc = await getDoc(doc(db, 'operacoes', operacao, 'cidades', cityId));
    if (!cityDoc.exists()) {
        throw new Error("City not found");
    }
    const setoresDisponiveis = (cityDoc.data() as { setoresDisponiveis: string[] }).setoresDisponiveis || [];
    return setoresDisponiveis.map((sectorName: string) => ({
        id: sectorName,
        nome: sectorName,
    }));
};

export const getSectorGeoJSONByOperacao = async (operacao: string, cityId: string, sectorName: string): Promise<GeoJSONFeatureCollection | null> => {
    await delay(500);
    const sectorDoc = await getDoc(doc(db, 'operacoes', operacao, 'cidades', cityId, 'setores', sectorName));
    if (!sectorDoc.exists()) {
        return null;
    }
    const data = sectorDoc.data() as { geoJSON: string };
    return JSON.parse(data.geoJSON);
};

export const updateSectorGeoJSONByOperacao = async (operacao: string, cityId: string, sectorName: string, geoJSON: GeoJSONFeatureCollection): Promise<void> => {
    const sectorRef = doc(db, 'operacoes', operacao, 'cidades', cityId, 'setores', sectorName);
    await setDoc(sectorRef, {
        nome: sectorName,
        geoJSON: JSON.stringify(geoJSON),
    }, { merge: true });
};

/**
 * Busca setores próximos à posição do usuário (dentro de um raio especificado)
 */
export const getNearbySectors = async (
    position: { lat: number; lng: number },
    maxDistance: number = 500
): Promise<NearbySector[]> => {
    const nearbySectors: NearbySector[] = [];
    const operacoes = await getOperacoes();

    for (const operacao of operacoes) {
        try {
            const cities = await getCitiesByOperacao(operacao);

            for (const city of cities) {
                try {
                    const sectors = await getSectorsByOperacaoAndCity(operacao, city.id);

                    for (const sector of sectors) {
                        try {
                            const geoJSON = await getSectorGeoJSONByOperacao(operacao, city.id, sector.id);
                            if (geoJSON) {
                                const distance = getDistanceToGeoJSON(position, geoJSON);
                                
                                if (distance <= maxDistance) {
                                    nearbySectors.push({
                                        operacao,
                                        cidade: city.nome,
                                        cidadeId: city.id,
                                        setor: sector.id,
                                        setorNome: sector.nome,
                                        distance,
                                    });
                                }
                            }
                        } catch (error) {
                            console.error(`Error loading sector ${sector.id}:`, error);
                        }
                    }
                } catch (error) {
                    console.error(`Error loading sectors for city ${city.id}:`, error);
                }
            }
        } catch (error) {
            console.error(`Error loading cities for operacao ${operacao}:`, error);
        }
    }

    // Ordenar por distância
    return nearbySectors.sort((a, b) => a.distance - b.distance);
};

// Legacy functions (keep for compatibility)
export const getCities = async (): Promise<City[]> => {
    await delay(300);
    const citiesRef = collection(db, 'cidades');
    const snapshot = await getDocs(citiesRef);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        nome: (doc.data() as { nome: string }).nome,
    }));
};

export const getSectors = async (cityId: string): Promise<Sector[]> => {
    await delay(200);
    const cityDoc = await getDoc(doc(db, 'cidades', cityId));
    if (!cityDoc.exists()) {
        throw new Error("City not found");
    }
    const setoresDisponiveis = (cityDoc.data() as { setoresDisponiveis: string[] }).setoresDisponiveis || [];
    return setoresDisponiveis.map((sectorName: string) => ({
        id: sectorName,
        nome: sectorName,
    }));
};

export const getSectorGeoJSON = async (cityId: string, sectorName: string): Promise<GeoJSONFeatureCollection | null> => {
    await delay(500);
    const sectorDoc = await getDoc(doc(db, 'cidades', cityId, 'setores', sectorName));
    if (!sectorDoc.exists()) {
        return null;
    }
    const data = sectorDoc.data() as { geoJSON: string };
    return JSON.parse(data.geoJSON);
};

export const updateSectorGeoJSON = async (cityId: string, sectorName: string, geoJSON: GeoJSONFeatureCollection): Promise<void> => {
    const sectorRef = doc(db, 'cidades', cityId, 'setores', sectorName);
    await setDoc(sectorRef, {
        nome: sectorName,
        geoJSON: JSON.stringify(geoJSON),
    }, { merge: true });
};

// --- ETL PROCESSING LOGIC ---

export const processAndStoreGeoJSON = async (geoJSON: GeoJSONFeatureCollection): Promise<void> => {
    await delay(1000); // Simulate processing time

    if (!geoJSON.features || geoJSON.features.length === 0) {
        throw new Error("GeoJSON file has no features.");
    }

    const firstFeature = geoJSON.features[0];
    const cityName = firstFeature.properties?.FILIAL as string;
    if (!cityName) {
        throw new Error("Cannot identify city name from GeoJSON properties (FILIAL).");
    }

    const cityId = cityName.toLowerCase().replace(/\s+/g, '_');

    const sectorsMap: Map<string, GeoJSONFeature[]> = new Map();

    for (const feature of geoJSON.features) {
        const sectorName = feature.properties?.SETOR as string;
        if (sectorName) {
            if (!sectorsMap.has(sectorName)) {
                sectorsMap.set(sectorName, []);
            }
            sectorsMap.get(sectorName)?.push(feature);
        }
    }

    if (sectorsMap.size === 0) {
        throw new Error("No sectors found in GeoJSON properties (SETOR).");
    }

    // Prepare data for storage
    const setoresDisponiveis = Array.from(sectorsMap.keys()).sort();

    // Update city document with setoresDisponiveis
    const cityRef = doc(db, 'cidades', cityId);
    await setDoc(cityRef, { nome: cityName, setoresDisponiveis }, { merge: true });

    // Store each sector
    for (const [sectorName, features] of sectorsMap.entries()) {
        const sectorRef = doc(db, 'cidades', cityId, 'setores', sectorName);
        await setDoc(sectorRef, {
            nome: sectorName,
            geoJSON: JSON.stringify({
                type: 'FeatureCollection',
                features: features,
            }),
        });
    }
};
