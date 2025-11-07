
import React, { useState } from 'react';
import type { City, Sector } from '../types';
import { AdminUploader } from './AdminUploader';
import type { User } from 'firebase/auth';

interface ControlsProps {
    cities: City[];
    selectedCityId: string;
    onCityChange: (cityId: string) => void;
    sectors: Sector[];
    selectedSectorName: string;
    onSectorChange: (sectorName: string) => void;
    onDataUploaded: () => void;
    isLoading: {
        cities: boolean;
        sectors: boolean;
        geojson: boolean;
    };
    user: User | null;
    onLogout: () => void;
}

const Selector = ({ label, value, onChange, options, disabled, loading, defaultOptionText }: { label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: { id: string, nome: string }[], disabled: boolean, loading: boolean, defaultOptionText: string }) => (
    <div className="w-full">
        <label htmlFor={label} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <div className="relative">
            <select
                id={label}
                value={value}
                onChange={onChange}
                disabled={disabled || loading}
                className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <option value="">{loading ? 'Loading...' : defaultOptionText}</option>
                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.nome}
                    </option>
                ))}
            </select>
        </div>
    </div>
);

export const Controls: React.FC<ControlsProps> = ({
    cities,
    selectedCityId,
    onCityChange,
    sectors,
    selectedSectorName,
    onSectorChange,
    onDataUploaded,
    isLoading,
    user,
    onLogout
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <>
            {/* Mobile Top Bar with Selectors */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-[700] bg-gray-900 border-b border-gray-700 shadow-lg">
                <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-lg font-bold text-white">GeoVisualizer</h1>
                        {user && (
                            <button
                                onClick={onLogout}
                                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                            >
                                Logout
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <select
                                value={selectedCityId}
                                onChange={(e) => onCityChange(e.target.value)}
                                disabled={isLoading.cities}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">{isLoading.cities ? 'Loading...' : 'City'}</option>
                                {cities.map((city) => (
                                    <option key={city.id} value={city.id}>
                                        {city.nome}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <select
                                value={selectedSectorName}
                                onChange={(e) => onSectorChange(e.target.value)}
                                disabled={!selectedCityId || isLoading.sectors}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                            >
                                <option value="">{isLoading.sectors ? 'Loading...' : 'Sector'}</option>
                                {sectors.map((sector) => (
                                    <option key={sector.id} value={sector.id}>
                                        {sector.nome}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {isLoading.geojson && (
                        <div className="flex items-center justify-center space-x-2 text-blue-300 text-xs py-1">
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span>Loading...</span>
                        </div>
                    )}
                    {user && (
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white font-medium"
                        >
                            {isCollapsed ? 'Show Admin Panel' : 'Hide Admin Panel'}
                        </button>
                    )}
                </div>
                {/* Mobile Admin Panel - Collapsible */}
                {user && !isCollapsed && (
                    <div className="border-t border-gray-700 p-3 bg-gray-800">
                        <AdminUploader onDataUploaded={onDataUploaded} />
                    </div>
                )}
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden md:block bg-gray-900 p-4 space-y-6 overflow-y-auto shadow-lg w-80 lg:w-96">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white">GeoVisualizer</h1>
                        <p className="text-sm text-gray-400">Select city and sector to display on map.</p>
                    </div>
                    {user && (
                        <button
                            onClick={onLogout}
                            className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300"
                        >
                            Logout
                        </button>
                    )}
                </header>

                <div className="space-y-4">
                    <Selector
                        label="City"
                        value={selectedCityId}
                        onChange={(e) => onCityChange(e.target.value)}
                        options={cities}
                        disabled={isLoading.cities}
                        loading={isLoading.cities}
                        defaultOptionText="-- Select a City --"
                    />
                    <Selector
                        label="Sector"
                        value={selectedSectorName}
                        onChange={(e) => onSectorChange(e.target.value)}
                        options={sectors}
                        disabled={!selectedCityId || isLoading.sectors}
                        loading={isLoading.sectors}
                        defaultOptionText="-- Select a Sector --"
                    />
                </div>

                {isLoading.geojson && (
                    <div className="flex items-center space-x-2 text-blue-300">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span>Loading Sector Geometry...</span>
                    </div>
                )}

                {user && (
                    <div className="border-t border-gray-700 pt-6">
                        <AdminUploader onDataUploaded={onDataUploaded} />
                    </div>
                )}
            </aside>
        </>
    );
};
