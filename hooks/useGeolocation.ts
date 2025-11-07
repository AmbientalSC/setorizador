
import { useState, useEffect } from 'react';

interface Position {
    lat: number;
    lng: number;
}

export const useGeolocation = () => {
    const [position, setPosition] = useState<Position | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check if running on localhost or HTTPS
        const isSecureContext = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        if (!isSecureContext) {
            console.warn('Geolocation requires HTTPS or localhost. Current context is not secure.');
            return;
        }

        if (!navigator.geolocation) {
            console.warn('Geolocation is not supported by your browser.');
            return;
        }

        const watcher = navigator.geolocation.watchPosition(
            (pos) => {
                setPosition({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                });
                setError(null);
            },
            (err) => {
                // Silently ignore geolocation errors
                console.warn('Geolocation error:', err.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );

        return () => {
            navigator.geolocation.clearWatch(watcher);
        };
    }, []);

    return { position, error };
};
