
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

// Coordenadas aproximadas das principais cidades (centros)
const CITY_COORDINATES: { [key: string]: { lat: number; lng: number } } = {
    'joinville': { lat: -26.3045, lng: -48.8487 },
    'itajai': { lat: -26.9077, lng: -48.6619 },
    'balneario_camboriu': { lat: -26.9908, lng: -48.6354 },
    'bc_bt': { lat: -26.9908, lng: -48.6354 },
    'camboriu': { lat: -27.0245, lng: -48.6551 },
    'sao_jose': { lat: -27.6099, lng: -48.6345 },
    'chapeco': { lat: -27.0965, lng: -52.6158 },
    'jaragua_do_sul': { lat: -26.4858, lng: -49.0776 },
    'rio_do_sul': { lat: -27.2144, lng: -49.6428 },
    'sfs': { lat: -26.2427, lng: -48.6378 }, // São Francisco do Sul
    'itapema': { lat: -27.0892, lng: -48.6111 },
    'itapema_bt': { lat: -27.0892, lng: -48.6111 },
    'abelardo_luz': { lat: -26.5716, lng: -52.3290 },
    'campo_ere': { lat: -26.3968, lng: -53.0773 },
    'coronel_freitas': { lat: -26.9046, lng: -52.7030 },
    'erval_velho': { lat: -27.2758, lng: -51.4511 },
    'santa_cecilia': { lat: -26.9591, lng: -50.4252 },
    'xanxere': { lat: -26.8768, lng: -52.4037 },
};

/**
 * Identifica a cidade onde o usuário está localizado
 */
export const detectUserCity = async (
    position: { lat: number; lng: number }
): Promise<{ operacao: string; city: City; distance: number } | null> => {
    const operacoes = await getOperacoes();
    let closestCity: { operacao: string; city: City; distance: number } | null = null;
    
    for (const operacao of operacoes) {
        try {
            const cities = await getCitiesByOperacao(operacao);
            
            for (const city of cities) {
                const cityCoord = CITY_COORDINATES[city.id];
                if (cityCoord) {
                    const distance = Math.sqrt(
                        Math.pow(position.lat - cityCoord.lat, 2) +
                        Math.pow(position.lng - cityCoord.lng, 2)
                    ) * 111000; // Conversão aproximada para metros
                    
                    if (!closestCity || distance < closestCity.distance) {
                        closestCity = { operacao, city, distance };
                    }
                }
            }
        } catch (error) {
            console.error(`Error loading cities for operacao ${operacao}:`, error);
        }
    }

    // Retorna apenas se a cidade estiver dentro de 50km
    if (closestCity && closestCity.distance <= 50000) {
        return closestCity;
    }
    
    return null;
};

/**
 * Busca os 3 setores mais próximos de uma operação específica em uma cidade
 * ULTRA OTIMIZADO: Busca apenas UMA operação e retorna no máximo 3 setores
 */
export const getNearbySectorsByOperation = async (
    position: { lat: number; lng: number },
    operacao: string,
    cityId: string,
    cityName: string,
    maxDistance: number = 2000, // 2km - raio razoável para setores urbanos
    maxResults: number = 3
): Promise<NearbySector[]> => {
    const nearbySectors: NearbySector[] = [];
    const MAX_SECTORS_TO_CHECK = 30; // Verificar no máximo 30 setores
    
    console.log(`🔍 Buscando até ${maxResults} setores de ${operacao} em ${cityName}...`);
    console.log(`📍 Posição do usuário: ${position.lat}, ${position.lng}`);
    console.log(`📏 Distância máxima: ${maxDistance}m`);

    try {
        const sectors = await getSectorsByOperacaoAndCity(operacao, cityId);
        
        // Limitar quantos setores verificar
        const sectorsToCheck = sectors.slice(0, MAX_SECTORS_TO_CHECK);
        console.log(`📋 Verificando ${sectorsToCheck.length} de ${sectors.length} setores`);
        
        for (const sector of sectorsToCheck) {
            // Se já encontrou os setores necessários, parar
            if (nearbySectors.length >= maxResults) {
                console.log(`✅ Já encontrados ${maxResults} setores, parando busca`);
                break;
            }

            try {
                const geoJSON = await getSectorGeoJSONByOperacao(operacao, cityId, sector.id);
                if (geoJSON) {
                    const distance = getDistanceToGeoJSON(position, geoJSON);
                    
                    if (distance <= maxDistance) {
                        nearbySectors.push({
                            operacao,
                            cidade: cityName,
                            cidadeId: cityId,
                            setor: sector.id,
                            setorNome: sector.nome,
                            distance,
                        });
                        console.log(`✓ Setor encontrado: ${sector.nome} (${Math.round(distance)}m)`);
                    }
                }
            } catch (error) {
                console.error(`❌ Error loading sector ${sector.id}:`, error);
            }
        }
    } catch (error) {
        console.error(`❌ Error loading sectors for ${operacao}:`, error);
    }

    console.log(`📊 Total encontrado: ${nearbySectors.length} setores`);
    
    // Ordenar por distância e retornar apenas os mais próximos
    return nearbySectors.sort((a, b) => a.distance - b.distance).slice(0, maxResults);
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
