
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
            {/* Toggle Button - Positioned to not overlap title */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`fixed z-[1000] p-3 bg-blue-600 hover:bg-blue-700 rounded-md shadow-xl text-white border-2 border-blue-400 transition-all duration-300 ${isCollapsed ? 'top-4 left-4' : 'top-24 left-4'
                    }`}
                aria-label="Toggle menu"
                style={{ width: '52px', height: '52px' }}
            >
                {isCollapsed ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                )}
            </button>

            {/* Overlay to close menu when clicked outside */}
            {!isCollapsed && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-[500] md:hidden"
                    onClick={() => setIsCollapsed(true)}
                />
            )}

            <aside className={`
                bg-gray-900 p-4 space-y-6 overflow-y-auto shadow-lg
                transition-transform duration-300 ease-in-out
                w-80 lg:w-96
                fixed md:relative top-0 left-0 h-full z-[600]
                ${isCollapsed ? '-translate-x-full' : 'translate-x-0'}
            `}>
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
