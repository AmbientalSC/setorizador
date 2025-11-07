
import React, { useState, useCallback } from 'react';
import { processAndStoreGeoJSON } from '../services/firebaseService';
import type { GeoJSONFeatureCollection } from '../types';

interface AdminUploaderProps {
    onDataUploaded: () => void;
}

export const AdminUploader: React.FC<AdminUploaderProps> = ({ onDataUploaded }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError(null);
        setSuccessMessage(null);
        setIsProcessing(true);

        try {
            const fileContent = await file.text();
            const geoJSON = JSON.parse(fileContent) as GeoJSONFeatureCollection;
            await processAndStoreGeoJSON(geoJSON);
            setSuccessMessage(`Successfully processed and stored data for ${geoJSON.features[0]?.properties?.FILIAL}.`);
            onDataUploaded();
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred during file processing.');
            console.error("File processing error:", err);
        } finally {
            setIsProcessing(false);
            // Reset file input to allow re-uploading the same file
            event.target.value = '';
        }
    }, [onDataUploaded]);

    return (
        <div className="space-y-3 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h2 className="text-lg font-semibold text-white">Admin: Process GeoJSON</h2>
            <p className="text-xs text-gray-400">Upload a master GeoJSON file. The system will split it by sector and store it optimally.</p>
            <div>
                <label htmlFor="file-upload" className={`relative cursor-pointer rounded-md font-medium text-blue-400 hover:text-blue-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 focus-within:ring-blue-500 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <span className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                        {isProcessing ? 'Processing...' : 'Upload GeoJSON File'}
                    </span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".geojson,.json" onChange={handleFileChange} disabled={isProcessing} />
                </label>
            </div>
            {isProcessing && (
                <div className="flex items-center text-sm text-gray-300">
                     <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Processing file, please wait...</span>
                </div>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            {successMessage && <p className="text-sm text-green-400">{successMessage}</p>}
        </div>
    );
};
