import React, { useState, useEffect, useCallback } from 'react';
import { Controls } from './components/Controls';
import { MapComponent } from './components/MapComponent';
import { Login } from './components/Login';
import { InitialModal } from './components/InitialModal';
import { Snackbar } from './components/Snackbar';
import { AdminManagement } from './components/AdminManagement';
import { useGeolocation } from './hooks/useGeolocation';
import {
    getCitiesByOperacao,
    getSectorsByOperacaoAndCity,
    getSectorGeoJSONByOperacao
} from './services/firebaseService';
import { login, logout, onAuthChange } from './services/authService';
import type { City, Sector, GeoJSONFeatureCollection } from './types';
import type { User } from 'firebase/auth';
import type { NearbySector } from './utils/geoUtils';

function App() {
    const { position, positionHistory, error: geoError } = useGeolocation();
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [loginLoading, setLoginLoading] = useState(false);
    const [showInitialModal, setShowInitialModal] = useState(true);
    const [selectedOperacao, setSelectedOperacao] = useState<string>('');
    const [cities, setCities] = useState<City[]>([]);
    const [selectedCityId, setSelectedCityId] = useState<string>('');
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [selectedSectorName, setSelectedSectorName] = useState<string>('');
    const [selectedSectorDisplayName, setSelectedSectorDisplayName] = useState<string>('');
    const [sectorGeoJSON, setSectorGeoJSON] = useState<GeoJSONFeatureCollection | null>(null);
    const [isLoading, setIsLoading] = useState({
        cities: true,
        sectors: false,
        geojson: false,
    });
    const [dataVersion, setDataVersion] = useState(0);
    const [activeTab, setActiveTab] = useState<'mapa' | 'gerenciamento' | 'debug'>('mapa');
    const [debugTrail, setDebugTrail] = useState<{ lat: number; lng: number }[]>([]);
    
    // Estados para o Snackbar
    const [isDetectingCity, setIsDetectingCity] = useState(false);
    const [detectedCityName, setDetectedCityName] = useState<string | null>(null);
    const [isLoadingNearby, setIsLoadingNearby] = useState(false);
    const [nearbySectors, setNearbySectors] = useState<NearbySector[]>([]);
    const [snackbarOperacao, setSnackbarOperacao] = useState<string>('');

    // Check authentication state
    useEffect(() => {
        const unsubscribe = onAuthChange((user) => {
            setUser(user);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async (email: string, password: string) => {
        setLoginLoading(true);
        setLoginError(null);
        try {
            await login(email, password);
            setLoginError(null); // Close modal on success
        } catch (error: any) {
            // If Firebase error, it usually has `code` and `message` fields.
            const code = error?.code;
            const message = error?.message || 'Failed to sign in';
            setLoginError(code ? `${code}: ${message}` : message);
        } finally {
            setLoginLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const openLoginModal = () => {
        setLoginError(''); // Set to empty string to show modal
    };

    const closeLoginModal = () => {
        setLoginError(null); // Set to null to hide modal
    };

    const handleInitialSubmit = async (operacao: string, cidade: string, setor: string, setorNome: string) => {
        setSelectedOperacao(operacao);
        setSelectedCityId(cidade.toLowerCase().replace(/\s+/g, '_'));
        setSelectedSectorName(setor);
        setSelectedSectorDisplayName(setorNome);
        setShowInitialModal(false);

        // Os useEffect já vão carregar os dados automaticamente
    };

    const handleCloseInitialModal = () => {
        setShowInitialModal(false);
    };

    const handleSelectSectorFromSnackbar = (sector: NearbySector) => {
        setSelectedOperacao(sector.operacao);
        setSelectedCityId(sector.cidadeId);
        setSelectedSectorName(sector.setor);
        setSelectedSectorDisplayName(sector.setorNome);
        setShowInitialModal(false);
        // Limpar setores próximos após seleção
        setNearbySectors([]);
    };
    
    const fetchCities = useCallback(async () => {
        if (!selectedOperacao) {
            setCities([]);
            return;
        }

        setIsLoading(prev => ({ ...prev, cities: true }));
        try {
            const cityList = await getCitiesByOperacao(selectedOperacao);
            setCities(cityList);
        } catch (error) {
            console.error("Failed to fetch cities:", error);
            setCities([]);
        } finally {
            setIsLoading(prev => ({ ...prev, cities: false }));
        }
    }, [selectedOperacao]);

    useEffect(() => {
        fetchCities();
    }, [fetchCities, dataVersion]);

    useEffect(() => {
        if (!selectedOperacao || !selectedCityId) {
            setSectors([]);
            setSelectedSectorName('');
            setSelectedSectorDisplayName('');
            setSectorGeoJSON(null);
            return;
        }

        const fetchSectors = async () => {
            setIsLoading(prev => ({ ...prev, sectors: true }));
            try {
                const sectorList = await getSectorsByOperacaoAndCity(selectedOperacao, selectedCityId);
                setSectors(sectorList);
            } catch (error) {
                console.error(`Failed to fetch sectors:`, error);
                setSectors([]);
            } finally {
                setIsLoading(prev => ({ ...prev, sectors: false }));
            }
        };

        fetchSectors();
    }, [selectedOperacao, selectedCityId]);

    useEffect(() => {
        if (!selectedOperacao || !selectedCityId || !selectedSectorName) {
            setSectorGeoJSON(null);
            return;
        }

        const fetchGeoJSON = async () => {
            setIsLoading(prev => ({ ...prev, geojson: true }));
            try {
                const geoJSONData = await getSectorGeoJSONByOperacao(selectedOperacao, selectedCityId, selectedSectorName);
                setSectorGeoJSON(geoJSONData);
            } catch (error) {
                console.error(`Failed to fetch GeoJSON for sector ${selectedSectorName}:`, error);
                setSectorGeoJSON(null);
            } finally {
                setIsLoading(prev => ({ ...prev, geojson: false }));
            }
        };

        fetchGeoJSON();
    }, [selectedOperacao, selectedCityId, selectedSectorName]);

    const handleDataUploaded = () => {
        setDataVersion(prev => prev + 1);
        setSelectedCityId('');
        setSelectedSectorName('');
        setSelectedSectorDisplayName('');
        setSectors([]);
        setSectorGeoJSON(null);
    };

    // Show login screen if not authenticated
    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-800 text-white font-sans">
            {/* Initial Modal */}
            {showInitialModal && !user && (
                <InitialModal 
                    onSubmit={handleInitialSubmit} 
                    onClose={handleCloseInitialModal}
                    userPosition={position}
                    onDetectingCityChange={setIsDetectingCity}
                    onDetectedCityChange={setDetectedCityName}
                    onLoadingNearbyChange={setIsLoadingNearby}
                    onNearbySectorsChange={setNearbySectors}
                    onOperacaoChange={setSnackbarOperacao}
                />
            )}

            {/* Snackbar para notificações */}
            <Snackbar
                isDetectingCity={isDetectingCity}
                detectedCityName={detectedCityName}
                isLoadingNearby={isLoadingNearby}
                nearbySectors={nearbySectors}
                selectedOperacao={snackbarOperacao}
                onSelectSector={handleSelectSectorFromSnackbar}
            />

            {/* Login Modal */}
            {!user && loginError !== null && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50">
                    <Login onLogin={handleLogin} error={loginError} isLoading={loginLoading} onClose={closeLoginModal} />
                </div>
            )}

            {/* Login Button - Top Right (Desktop only) */}
            {!user && (
                <button
                    onClick={openLoginModal}
                    className="hidden md:block fixed top-3 right-3 z-[800] p-3 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg text-white"
                    aria-label="Admin Login"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
            )}

            {user ? (
                // Interface do Administrador com Abas
                <div className="flex flex-col h-full">
                    {/* Abas */}
                    <div className="flex bg-gray-700">
                        <button
                            onClick={() => setActiveTab('mapa')}
                            className={`flex-1 p-4 text-center font-medium transition-colors ${
                                activeTab === 'mapa' ? 'bg-gray-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            Mapa
                        </button>
                        <button
                            onClick={() => setActiveTab('gerenciamento')}
                            className={`flex-1 p-4 text-center font-medium transition-colors ${
                                activeTab === 'gerenciamento' ? 'bg-gray-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            Gerenciamento
                        </button>
                        <button
                            onClick={() => setActiveTab('debug')}
                            className={`flex-1 p-4 text-center font-medium transition-colors ${
                                activeTab === 'debug' ? 'bg-gray-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            DEBUG
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-4 bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
                        >
                            Logout
                        </button>
                    </div>

                    {/* Conteúdo das Abas */}
                    <div className="flex-1">
                        {activeTab === 'mapa' ? (
                            <div className="flex flex-col md:flex-row h-full">
                                <Controls
                                    cities={cities}
                                    selectedCityId={selectedCityId}
                                    onCityChange={setSelectedCityId}
                                    sectors={sectors}
                                    selectedSectorName={selectedSectorName}
                                    selectedSectorDisplayName={selectedSectorDisplayName}
                                    onSectorChange={setSelectedSectorName}
                                    onDataUploaded={handleDataUploaded}
                                    isLoading={isLoading}
                                    user={user}
                                    onLogout={handleLogout}
                                />
                                <main className="flex-1 h-full w-full relative pt-[120px] md:pt-0">
                                    {geoError && <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-red-500 p-2 rounded-md shadow-lg">{geoError}</div>}
                                    <MapComponent userPosition={position} positionHistory={positionHistory} sectorGeoJSON={sectorGeoJSON} />

                                    {/* Botão Trocar Setor - Canto Inferior Direito */}
                                    <button
                                        onClick={() => setShowInitialModal(true)}
                                        className="fixed bottom-4 right-4 z-[900] p-4 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg text-white transition-colors"
                                        aria-label="Trocar Setor"
                                        title="Trocar Setor"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                        </svg>
                                    </button>
                                </main>
                            </div>
                        ) : activeTab === 'gerenciamento' ? (
                            <AdminManagement onDataUploaded={handleDataUploaded} />
                        ) : (
                            // DEBUG tab: allow clicking on the map to create a test trail
                            <div className="flex flex-col md:flex-row h-full">
                                <aside className="w-full md:w-72 bg-gray-700 p-4 space-y-4">
                                    <h2 className="text-lg font-semibold">DEBUG - Criar Rastro</h2>
                                    <p className="text-sm text-gray-300">Clique no mapa para adicionar pontos ao rastro de teste. Use Limpar ou Desfazer para ajustar.</p>
                                    <div className="space-x-2">
                                        <button
                                            onClick={() => setDebugTrail([])}
                                            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                                        >
                                            Limpar
                                        </button>
                                        <button
                                            onClick={() => setDebugTrail(prev => prev.slice(0, -1))}
                                            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
                                        >
                                            Desfazer
                                        </button>
                                    </div>
                                    <div className="text-sm text-gray-200 mt-2">
                                        Pontos: {debugTrail.length}
                                    </div>
                                    <div className="max-h-64 overflow-auto text-xs font-mono bg-gray-800 p-2 rounded">
                                        {debugTrail.map((p, i) => (
                                            <div key={i}>[{i}] {p.lat.toFixed(6)}, {p.lng.toFixed(6)}</div>
                                        ))}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-2">Quando terminar, você pode copiar os pontos e testar o comportamento dos rastros.</div>
                                </aside>
                                <main className="flex-1 h-full w-full relative pt-[120px] md:pt-0">
                                    {geoError && <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-red-500 p-2 rounded-md shadow-lg">{geoError}</div>}
                                    <MapComponent
                                        userPosition={position}
                                        positionHistory={positionHistory}
                                        sectorGeoJSON={sectorGeoJSON}
                                        onMapClick={(lat, lng) => setDebugTrail(prev => [...prev, { lat, lng }])}
                                        debugTrail={debugTrail}
                                        debugMode={true}
                                    />
                                </main>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // Interface do Usuário Não Logado
                <div className="flex flex-col md:flex-row h-full">
                    <Controls
                        cities={cities}
                        selectedCityId={selectedCityId}
                        onCityChange={setSelectedCityId}
                        sectors={sectors}
                        selectedSectorName={selectedSectorName}
                        selectedSectorDisplayName={selectedSectorDisplayName}
                        onSectorChange={setSelectedSectorName}
                        onDataUploaded={handleDataUploaded}
                        isLoading={isLoading}
                        user={user}
                        onLogout={handleLogout}
                    />
                    <main className="flex-1 h-full w-full relative pt-[120px] md:pt-0">
                        {geoError && <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-red-500 p-2 rounded-md shadow-lg">{geoError}</div>}
                        <MapComponent userPosition={position} positionHistory={positionHistory} sectorGeoJSON={sectorGeoJSON} />

                        {/* Botão Trocar Setor - Canto Inferior Direito */}
                        <button
                            onClick={() => setShowInitialModal(true)}
                            className="fixed bottom-4 right-4 z-[900] p-4 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg text-white transition-colors"
                            aria-label="Trocar Setor"
                            title="Trocar Setor"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                        </button>
                    </main>
                </div>
            )}
        </div>
    );
}

export default App;
