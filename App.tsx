
import React, { useState, useEffect, useCallback } from 'react';
import { Controls } from './components/Controls';
import { MapComponent } from './components/MapComponent';
import { Login } from './components/Login';
import { useGeolocation } from './hooks/useGeolocation';
import { getCities, getSectors, getSectorGeoJSON } from './services/firebaseService';
import { login, logout, onAuthChange } from './services/authService';
import type { City, Sector, GeoJSONFeatureCollection } from './types';
import type { User } from 'firebase/auth';

function App() {
    const { position, positionHistory, error: geoError } = useGeolocation();
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [loginLoading, setLoginLoading] = useState(false);
    const [cities, setCities] = useState<City[]>([]);
    const [selectedCityId, setSelectedCityId] = useState<string>('');
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [selectedSectorName, setSelectedSectorName] = useState<string>('');
    const [sectorGeoJSON, setSectorGeoJSON] = useState<GeoJSONFeatureCollection | null>(null);
    const [isLoading, setIsLoading] = useState({
        cities: true,
        sectors: false,
        geojson: false,
    });
    const [dataVersion, setDataVersion] = useState(0);

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
            setLoginError(error.message || 'Failed to sign in');
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

    const fetchCities = useCallback(async () => {
        setIsLoading(prev => ({ ...prev, cities: true }));
        try {
            const cityList = await getCities();
            setCities(cityList);
        } catch (error) {
            console.error("Failed to fetch cities:", error);
        } finally {
            setIsLoading(prev => ({ ...prev, cities: false }));
        }
    }, []);

    useEffect(() => {
        fetchCities();
    }, [fetchCities, dataVersion]);

    useEffect(() => {
        if (!selectedCityId) {
            setSectors([]);
            setSelectedSectorName('');
            setSectorGeoJSON(null);
            return;
        }

        const fetchSectors = async () => {
            setIsLoading(prev => ({ ...prev, sectors: true }));
            setSectorGeoJSON(null);
            setSelectedSectorName('');
            try {
                const sectorList = await getSectors(selectedCityId);
                setSectors(sectorList);
            } catch (error) {
                console.error(`Failed to fetch sectors for city ${selectedCityId}:`, error);
                setSectors([]);
            } finally {
                setIsLoading(prev => ({ ...prev, sectors: false }));
            }
        };

        fetchSectors();
    }, [selectedCityId]);

    useEffect(() => {
        if (!selectedCityId || !selectedSectorName) {
            setSectorGeoJSON(null);
            return;
        }

        const fetchGeoJSON = async () => {
            setIsLoading(prev => ({ ...prev, geojson: true }));
            try {
                const geoJSONData = await getSectorGeoJSON(selectedCityId, selectedSectorName);
                setSectorGeoJSON(geoJSONData);
            } catch (error) {
                console.error(`Failed to fetch GeoJSON for sector ${selectedSectorName}:`, error);
                setSectorGeoJSON(null);
            } finally {
                setIsLoading(prev => ({ ...prev, geojson: false }));
            }
        };

        fetchGeoJSON();
    }, [selectedCityId, selectedSectorName]);

    const handleDataUploaded = () => {
        setDataVersion(prev => prev + 1);
        setSelectedCityId('');
        setSelectedSectorName('');
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
        <div className="flex flex-col md:flex-row h-screen bg-gray-800 text-white font-sans">
            {/* Login Modal */}
            {!user && loginError !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <Login onLogin={handleLogin} error={loginError} isLoading={loginLoading} onClose={closeLoginModal} />
                </div>
            )}

            {/* Login Button - Top Right */}
            {!user && (
                <button
                    onClick={openLoginModal}
                    className="fixed top-4 right-4 z-[1000] px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md shadow-lg text-white font-medium"
                >
                    Admin Login
                </button>
            )}

            <Controls
                cities={cities}
                selectedCityId={selectedCityId}
                onCityChange={setSelectedCityId}
                sectors={sectors}
                selectedSectorName={selectedSectorName}
                onSectorChange={setSelectedSectorName}
                onDataUploaded={handleDataUploaded}
                isLoading={isLoading}
                user={user}
                onLogout={handleLogout}
            />
            <main className="flex-1 h-full w-full relative">
                {geoError && <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-red-500 p-2 rounded-md shadow-lg">{geoError}</div>}
                <MapComponent userPosition={position} positionHistory={positionHistory} sectorGeoJSON={sectorGeoJSON} />
            </main>
        </div>
    );
}

export default App;
