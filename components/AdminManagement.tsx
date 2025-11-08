import React, { useState, useEffect } from 'react';
import { getOperacoes, getCitiesByOperacao, getSectorsByOperacaoAndCity, getSectorGeoJSONByOperacao, updateSectorGeoJSONByOperacao } from '../services/firebaseService';
import { AdminUploader } from './AdminUploader';
import type { City, Sector } from '../types';
import type { GeoJSONFeatureCollection } from '../types';

interface AdminManagementProps {
    onDataUploaded: () => void;
}

export const AdminManagement: React.FC<AdminManagementProps> = ({ onDataUploaded }) => {
    const [operacoes, setOperacoes] = useState<string[]>([]);
    const [selectedOperacao, setSelectedOperacao] = useState<string>('');
    const [cities, setCities] = useState<City[]>([]);
    const [selectedCity, setSelectedCity] = useState<City | null>(null);
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [isLoadingSectors, setIsLoadingSectors] = useState(false);

    useEffect(() => {
        const loadOperacoes = async () => {
            const ops = await getOperacoes();
            setOperacoes(ops);
            if (ops.length > 0) {
                setSelectedOperacao(ops[0]);
            }
        };
        loadOperacoes();
    }, []);

    useEffect(() => {
        if (!selectedOperacao) return;

        const loadCities = async () => {
            setIsLoadingCities(true);
            try {
                const cityList = await getCitiesByOperacao(selectedOperacao);
                setCities(cityList);
                setSelectedCity(null);
                setSectors([]);
            } catch (error) {
                console.error('Error loading cities:', error);
                setCities([]);
            } finally {
                setIsLoadingCities(false);
            }
        };
        loadCities();
    }, [selectedOperacao]);

    const handleCityClick = async (city: City) => {
        setSelectedCity(city);
        setIsLoadingSectors(true);
        try {
            const sectorList = await getSectorsByOperacaoAndCity(selectedOperacao, city.id);
            setSectors(sectorList);
        } catch (error) {
            console.error('Error loading sectors:', error);
            setSectors([]);
        } finally {
            setIsLoadingSectors(false);
        }
    };

    const [selectedSectorObj, setSelectedSectorObj] = useState<Sector | null>(null);
    const [sectorGeoJSONText, setSectorGeoJSONText] = useState<string>('');
    const [isLoadingSectorGeo, setIsLoadingSectorGeo] = useState(false);
    const [isSavingSectorGeo, setIsSavingSectorGeo] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    const handleSectorClick = async (sector: Sector) => {
        if (!selectedOperacao || !selectedCity) return;
        setSelectedSectorObj(sector);
        setIsLoadingSectorGeo(true);
        setSectorGeoJSONText('');
        setSaveMessage(null);
        try {
            const geo = await getSectorGeoJSONByOperacao(selectedOperacao, selectedCity.id, sector.id);
            if (!geo) {
                setSectorGeoJSONText('// Sem GeoJSON para este setor');
            } else {
                setSectorGeoJSONText(JSON.stringify(geo, null, 2));
            }
        } catch (err) {
            console.error('Error loading sector geojson:', err);
            setSectorGeoJSONText('// Erro ao carregar GeoJSON');
        } finally {
            setIsLoadingSectorGeo(false);
        }
    };

    const handleSaveSectorGeo = async () => {
        if (!selectedOperacao || !selectedCity || !selectedSectorObj) return;
        setIsSavingSectorGeo(true);
        setSaveMessage(null);
        try {
            const parsed = JSON.parse(sectorGeoJSONText) as GeoJSONFeatureCollection;
            await updateSectorGeoJSONByOperacao(selectedOperacao, selectedCity.id, selectedSectorObj.id, parsed);
            setSaveMessage('Salvo com sucesso.');
            // notify parent to refresh lists
            onDataUploaded();
        } catch (err: any) {
            console.error('Error saving sector geojson:', err);
            setSaveMessage('Erro ao salvar: ' + (err?.message || String(err)));
        } finally {
            setIsSavingSectorGeo(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-800 text-white p-4 space-y-4">
            <h1 className="text-2xl font-bold">Gerenciamento de Setores</h1>

            {/* Seletor de Operação */}
            <div className="space-y-2">
                <label className="block text-sm font-medium">Operação:</label>
                <select
                    value={selectedOperacao}
                    onChange={(e) => setSelectedOperacao(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                >
                    {operacoes.map((op) => (
                        <option key={op} value={op}>
                            {op.charAt(0).toUpperCase() + op.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex flex-1 space-x-4">
                {/* Lista de Cidades */}
                <div className="flex-1 bg-gray-700 rounded-lg p-4">
                    <h2 className="text-lg font-semibold mb-4">Cidades</h2>
                    {isLoadingCities ? (
                        <div className="text-center">Carregando cidades...</div>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {cities.map((city) => (
                                <button
                                    key={city.id}
                                    onClick={() => handleCityClick(city)}
                                    className={`w-full text-left p-3 rounded-md transition-colors ${
                                        selectedCity?.id === city.id
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                                    }`}
                                >
                                    {city.nome}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Lista de Setores */}
                <div className="flex-1 bg-gray-700 rounded-lg p-4">
                    <h2 className="text-lg font-semibold mb-4">
                        Setores {selectedCity ? `- ${selectedCity.nome}` : ''}
                    </h2>
                    {selectedCity ? (
                        isLoadingSectors ? (
                            <div className="text-center">Carregando setores...</div>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {sectors.map((sector) => (
                                    <button
                                        key={sector.id}
                                        onClick={() => handleSectorClick(sector)}
                                        className={`w-full text-left p-3 rounded-md transition-colors ${
                                            selectedSectorObj?.id === sector.id
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                                        }`}
                                    >
                                        {sector.nome}
                                    </button>
                                ))}
                            </div>
                        )
                    ) : (
                        <div className="text-center text-gray-400">
                            Selecione uma cidade para ver os setores
                        </div>
                    )}
                </div>
            </div>

            {/* Editor / Upload Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2">Editor do Setor</h3>
                    {selectedSectorObj ? (
                        <>
                            <div className="text-sm text-gray-300 mb-2">Setor: <span className="font-medium">{selectedSectorObj.nome}</span></div>
                            {isLoadingSectorGeo ? (
                                <div>Carregando GeoJSON...</div>
                            ) : (
                                <textarea
                                    value={sectorGeoJSONText}
                                    onChange={(e) => setSectorGeoJSONText(e.target.value)}
                                    className="w-full h-64 bg-gray-800 border border-gray-600 rounded p-2 text-xs font-mono text-white"
                                />
                            )}
                            <div className="mt-3 flex items-center space-x-2">
                                <button
                                    onClick={handleSaveSectorGeo}
                                    disabled={isSavingSectorGeo}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                                >
                                    {isSavingSectorGeo ? 'Salvando...' : 'Salvar'}
                                </button>
                                <button
                                    onClick={() => { setSelectedSectorObj(null); setSectorGeoJSONText(''); setSaveMessage(null); }}
                                    className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                                >
                                    Fechar
                                </button>
                                {saveMessage && <div className="text-sm text-gray-200 ml-2">{saveMessage}</div>}
                            </div>
                        </>
                    ) : (
                        <div className="text-gray-400">Selecione um setor à esquerda para ver o GeoJSON e editar.</div>
                    )}
                </div>

                <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2">Upload</h3>
                    <AdminUploader onDataUploaded={onDataUploaded} />
                </div>
            </div>
        </div>
    );
};