
import React, { useState, useRef, useEffect } from 'react';
import type { City, Sector } from '../types';
import type { User } from 'firebase/auth';

interface ControlsProps {
    cities: City[];
    selectedCityId: string;
    onCityChange: (cityId: string) => void;
    sectors: Sector[];
    selectedSectorName: string;
    selectedSectorDisplayName: string;
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

// Searchable Select Component
const SearchableSelect = ({
    label,
    value,
    onChange,
    options,
    disabled,
    loading,
    placeholder,
    displayValue
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { id: string; nome: string }[];
    disabled: boolean;
    loading: boolean;
    placeholder: string;
    displayValue?: string;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.id === value);
    const displayText = displayValue || selectedOption?.nome || placeholder;
    const filteredOptions = options.filter(opt =>
        opt.nome.toLowerCase().includes(searchTerm.toLowerCase())
    ); useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="w-full" ref={wrapperRef}>
            <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled || loading}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-left focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                    <span className="block truncate">
                        {loading ? 'Carregando...' : displayText}
                    </span>
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </span>
                </button>

                {isOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-hidden">
                        <div className="p-2 border-b border-gray-600">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar..."
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                autoFocus
                            />
                        </div>
                        <ul className="max-h-48 overflow-y-auto">
                            {filteredOptions.length === 0 ? (
                                <li className="px-3 py-2 text-sm text-gray-400">Nenhum resultado encontrado</li>
                            ) : (
                                filteredOptions.map((option) => (
                                    <li
                                        key={option.id}
                                        onClick={() => {
                                            onChange(option.id);
                                            setIsOpen(false);
                                            setSearchTerm('');
                                        }}
                                        className={`cursor-pointer px-3 py-2 text-sm hover:bg-gray-700 ${option.id === value ? 'bg-blue-600 text-white' : 'text-gray-200'
                                            }`}
                                    >
                                        {option.nome}
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

// Compact Searchable Select for Mobile
const CompactSearchableSelect = ({
    value,
    onChange,
    options,
    disabled,
    loading,
    placeholder
}: {
    value: string;
    onChange: (value: string) => void;
    options: { id: string; nome: string }[];
    disabled: boolean;
    loading: boolean;
    placeholder: string;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.id === value);
    const filteredOptions = options.filter(opt =>
        opt.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled || loading}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white text-left focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
                <span className="block truncate text-xs">
                    {loading ? 'Carregando...' : (selectedOption?.nome || placeholder)}
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-[800] mt-1 w-full bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-64 overflow-hidden">
                    <div className="p-2 border-b border-gray-600">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar..."
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                        />
                    </div>
                    <ul className="max-h-52 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <li className="px-2 py-2 text-xs text-gray-400">Nenhum resultado</li>
                        ) : (
                            filteredOptions.map((option) => (
                                <li
                                    key={option.id}
                                    onClick={() => {
                                        onChange(option.id);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    className={`cursor-pointer px-2 py-2 text-xs hover:bg-gray-700 ${option.id === value ? 'bg-blue-600 text-white' : 'text-gray-200'
                                        }`}
                                >
                                    {option.nome}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

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
    selectedSectorDisplayName,
    onSectorChange,
    onDataUploaded,
    isLoading,
    user,
    onLogout
}) => {
    return (
        <>
            {/* Mobile Top Bar - Display Only */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-[700] bg-gray-900 border-b border-gray-700 shadow-lg">
                <div className="p-3">
                    <div className="flex items-center justify-between">
                        <h1 className="text-lg font-bold text-white">AmbSetores</h1>
                        {user && (
                            <button
                                onClick={onLogout}
                                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                            >
                                Logout
                            </button>
                        )}
                    </div>

                    {/* Display selected city and sector as labels */}
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-800 rounded px-2 py-1.5 border border-gray-700">
                            <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5">Cidade</div>
                            <div className="text-white font-medium truncate">
                                {cities.find(c => c.id === selectedCityId)?.nome || '—'}
                            </div>
                        </div>
                        <div className="bg-gray-800 rounded px-2 py-1.5 border border-gray-700">
                            <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5">Setor</div>
                            <div className="text-white font-medium truncate">
                                {selectedSectorDisplayName || sectors.find(s => s.id === selectedSectorName)?.nome || selectedSectorName || '—'}
                            </div>
                        </div>
                    </div>

                    {isLoading.geojson && (
                        <div className="flex items-center justify-center space-x-2 text-blue-300 text-xs py-2 mt-2">
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span>Carregando...</span>
                        </div>
                    )}

                    {/* Admin panel moved to separate tab */}
                </div>
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden md:block bg-gray-900 p-4 space-y-6 overflow-y-auto shadow-lg w-80 lg:w-96">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white">GeoVisualizer</h1>
                        <p className="text-sm text-gray-400">Selecione a cidade e o setor para exibir no mapa.</p>
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
                    <SearchableSelect
                        label="Cidade"
                        value={selectedCityId}
                        onChange={onCityChange}
                        options={cities}
                        disabled={isLoading.cities}
                        loading={isLoading.cities}
                        placeholder="-- Selecione uma Cidade --"
                    />
                    <SearchableSelect
                        label="Setor"
                        value={selectedSectorName}
                        onChange={onSectorChange}
                        options={sectors}
                        disabled={!selectedCityId || isLoading.sectors}
                        loading={isLoading.sectors}
                        placeholder="-- Selecione um Setor --"
                        displayValue={selectedSectorDisplayName}
                    />
                </div>

                {isLoading.geojson && (
                    <div className="flex items-center space-x-2 text-blue-300">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span>Carregando Geometria do Setor...</span>
                    </div>
                )}

                {user && (
                    <div className="border-t border-gray-700 pt-6">
                        {/* Admin panel moved to separate tab */}
                    </div>
                )}
            </aside>
        </>
    );
};
