
import type { GeoJsonObject } from 'geojson';

export interface City {
    id: string;
    nome: string;
}

export interface Sector {
    id: string;
    nome: string;
}

export interface GeoJSONProperties {
    [name: string]: any;
    FILIAL?: string;
    SETOR?: string;
}

export interface GeoJSONFeature {
    type: 'Feature';
    properties: GeoJSONProperties;
    geometry: GeoJsonObject;
}

export interface GeoJSONFeatureCollection {
    type: 'FeatureCollection';
    features: GeoJSONFeature[];
}
