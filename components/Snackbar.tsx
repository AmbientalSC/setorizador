import React from 'react';
import type { NearbySector } from '../utils/geoUtils';

interface SnackbarProps {
    isDetectingCity: boolean;
    detectedCityName: string | null;
    isLoadingNearby: boolean;
    nearbySectors: NearbySector[];
    selectedOperacao: string;
    onSelectSector: (sector: NearbySector) => void;
}

export const Snackbar: React.FC<SnackbarProps> = ({
    isDetectingCity,
    detectedCityName,
    isLoadingNearby,
    nearbySectors,
    selectedOperacao,
    onSelectSector,
}) => {
    // Não mostrar nada se não houver notificações
    const hasNotification = isDetectingCity || detectedCityName || isLoadingNearby || nearbySectors.length > 0;
    
    if (!hasNotification) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[10000] max-w-md space-y-3">
            {/* Detectando cidade */}
            {isDetectingCity && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-4 animate-slide-up">
                    <div className="flex items-center">
                        <svg className="animate-spin h-5 w-5 text-blue-400 mr-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm text-gray-300">Detectando sua cidade...</span>
                    </div>
                </div>
            )}

            {/* Cidade detectada */}
            {detectedCityName && !isDetectingCity && !isLoadingNearby && nearbySectors.length === 0 && (
                <div className="bg-green-900 bg-opacity-90 border border-green-700 rounded-lg shadow-2xl p-4 animate-slide-up">
                    <div className="flex items-center">
                        <svg className="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <div className="text-sm font-medium text-green-300">Cidade detectada</div>
                            <div className="text-base font-bold text-white">{detectedCityName}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Buscando setores próximos */}
            {isLoadingNearby && selectedOperacao && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-4 animate-slide-up">
                    <div className="flex items-center">
                        <svg className="animate-spin h-5 w-5 text-blue-400 mr-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm text-gray-300">
                            Buscando os 3 setores mais próximos de <span className="font-semibold text-white">{selectedOperacao}</span>...
                        </span>
                    </div>
                </div>
            )}

            {/* Top 3 setores próximos */}
            {nearbySectors.length > 0 && !isLoadingNearby && selectedOperacao && (
                <div className="bg-blue-900 bg-opacity-95 border border-blue-700 rounded-lg shadow-2xl p-4 animate-slide-up max-w-md">
                    <div className="flex items-center mb-3">
                        <svg className="w-6 h-6 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <h3 className="text-sm font-bold text-blue-300">
                            Top 3 setores - {selectedOperacao.toUpperCase()}
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {nearbySectors.map((nearby, index) => (
                            <button
                                key={index}
                                onClick={() => onSelectSector(nearby)}
                                className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors group border border-gray-700 hover:border-blue-500"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center flex-1">
                                        <span className="text-xl font-bold text-blue-400 mr-3 min-w-[32px]">#{index + 1}</span>
                                        <div className="flex-1">
                                            <div className="font-medium text-white group-hover:text-blue-300 transition-colors">
                                                {nearby.setorNome}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                Clique para visualizar
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-bold text-blue-400 whitespace-nowrap ml-3">
                                        {nearby.distance < 1000 
                                            ? `${Math.round(nearby.distance)}m`
                                            : `${(nearby.distance / 1000).toFixed(1)}km`
                                        }
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
