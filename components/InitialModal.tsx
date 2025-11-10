import React, { useState, useEffect, useRef } from 'react';
import { getOperacoes, getCitiesByOperacao, getSectorsByOperacaoAndCity, getNearbySectors, detectUserCity } from '../services/firebaseService';
import type { City, Sector } from '../types';
import type { NearbySector } from '../utils/geoUtils';

interface InitialModalProps {
    onSubmit: (operacao: string, cidade: string, setor: string, setorNome: string) => void;
    onClose?: () => void;
    userPosition?: { lat: number; lng: number } | null;
}

// Searchable Select Component for Modal
const ModalSearchableSelect = ({
    label,
    value,
    onChange,
    options,
    disabled,
    loading,
    placeholder
}: {
    label: string;
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
        <div className="w-full" ref={wrapperRef}>
            <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled || loading}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                    <span className="block truncate">
                        {loading ? 'Carregando...' : (selectedOption?.nome || placeholder)}
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

export const InitialModal: React.FC<InitialModalProps> = ({ onSubmit, onClose, userPosition }) => {
    const [operacao, setOperacao] = useState('');
    const [cidade, setCidade] = useState('');
    const [setor, setSetor] = useState('');
    const [operacoes, setOperacoes] = useState<string[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [nearbySectors, setNearbySectors] = useState<NearbySector[]>([]);
    const [detectedCity, setDetectedCity] = useState<{ nome: string; distance: number } | null>(null);
    const [isLoadingNearby, setIsLoadingNearby] = useState(false);
    const [isDetectingCity, setIsDetectingCity] = useState(false);
    const [isLoading, setIsLoading] = useState({
        operacoes: true,
        cities: false,
        sectors: false,
    });

    // Carregar operações ao montar
    useEffect(() => {
        const loadOperacoes = async () => {
            try {
                const ops = await getOperacoes();
                setOperacoes(ops);
            } catch (error) {
                console.error('Error loading operacoes:', error);
            } finally {
                setIsLoading(prev => ({ ...prev, operacoes: false }));
            }
        };
        loadOperacoes();
    }, []);

    // Detectar cidade e buscar setores próximos quando a posição estiver disponível
    useEffect(() => {
        if (userPosition) {
            const detectAndLoadNearbySectors = async () => {
                setIsDetectingCity(true);
                setIsLoadingNearby(true);
                try {
                    // Primeiro detectar a cidade
                    const cityInfo = await detectUserCity(userPosition);
                    
                    if (cityInfo) {
                        setDetectedCity({
                            nome: cityInfo.city.nome,
                            distance: cityInfo.distance
                        });
                        
                        // Depois buscar setores próximos apenas nessa cidade
                        const nearby = await getNearbySectors(
                            userPosition, 
                            500,
                            { operacao: cityInfo.operacao, city: cityInfo.city }
                        );
                        setNearbySectors(nearby);
                    } else {
                        setDetectedCity(null);
                        setNearbySectors([]);
                    }
                } catch (error) {
                    console.error('Error detecting city or loading nearby sectors:', error);
                    setDetectedCity(null);
                    setNearbySectors([]);
                } finally {
                    setIsDetectingCity(false);
                    setIsLoadingNearby(false);
                }
            };
            detectAndLoadNearbySectors();
        }
    }, [userPosition]);

    // Carregar cidades quando operação mudar
    useEffect(() => {
        if (!operacao) {
            setCities([]);
            setCidade('');
            setSectors([]);
            setSetor('');
            return;
        }

        const loadCities = async () => {
            setIsLoading(prev => ({ ...prev, cities: true }));
            setCidade('');
            setSectors([]);
            setSetor('');
            try {
                const cityList = await getCitiesByOperacao(operacao);
                setCities(cityList);
            } catch (error) {
                console.error('Error loading cities:', error);
                setCities([]);
            } finally {
                setIsLoading(prev => ({ ...prev, cities: false }));
            }
        };
        loadCities();
    }, [operacao]);

    // Carregar setores quando cidade mudar
    useEffect(() => {
        if (!operacao || !cidade) {
            setSectors([]);
            setSetor('');
            return;
        }

        const loadSectors = async () => {
            setIsLoading(prev => ({ ...prev, sectors: true }));
            setSetor('');
            try {
                const sectorList = await getSectorsByOperacaoAndCity(operacao, cidade);
                setSectors(sectorList);
            } catch (error) {
                console.error('Error loading sectors:', error);
                setSectors([]);
            } finally {
                setIsLoading(prev => ({ ...prev, sectors: false }));
            }
        };
        loadSectors();
    }, [operacao, cidade]);

    const handleSubmit = () => {
        if (operacao && cidade && setor) {
            const selectedSector = sectors.find(s => s.id === setor);
            const setorNome = selectedSector?.nome || setor;
            onSubmit(operacao, cidade, setor, setorNome);
        }
    };

    const handleSelectNearbySector = (nearby: NearbySector) => {
        setOperacao(nearby.operacao);
        setCidade(nearby.cidadeId);
        setSetor(nearby.setor);
        // Automaticamente submeter
        setTimeout(() => {
            onSubmit(nearby.operacao, nearby.cidadeId, nearby.setor, nearby.setorNome);
        }, 100);
    };

    const isValid = operacao && cidade && setor;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-80">
            <div className="max-w-md w-full mx-4">
                <div className="bg-gray-800 rounded-lg shadow-2xl p-8 relative">
                    {/* Botão de Fechar */}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                            aria-label="Fechar"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                    
                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-bold text-white mb-2">AmbSetores</h1>
                        <p className="text-gray-400 text-sm">Visualizador de Setores de Coleta</p>
                    </div>

                    {/* Cidade Detectada */}
                    {isDetectingCity && (
                        <div className="mb-4 p-3 bg-gray-700 rounded-lg text-center">
                            <div className="flex items-center justify-center">
                                <svg className="animate-spin h-4 w-4 text-blue-400 mr-2" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="text-sm text-gray-300">Detectando sua cidade...</span>
                            </div>
                        </div>
                    )}

                    {detectedCity && !isDetectingCity && (
                        <div className="mb-4 p-3 bg-green-900 bg-opacity-30 border border-green-700 rounded-lg">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <span className="text-sm font-medium text-green-300">Você está em: </span>
                                    <span className="text-sm font-bold text-white">{detectedCity.nome}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Setores Próximos */}
                    {nearbySectors.length > 0 && (
                        <div className="mb-6 p-4 bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg">
                            <div className="flex items-center mb-3">
                                <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <h3 className="text-sm font-semibold text-blue-300">Setores próximos a você</h3>
                            </div>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {nearbySectors.slice(0, 5).map((nearby, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSelectNearbySector(nearby)}
                                        className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors group"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-medium text-white group-hover:text-blue-300 transition-colors">
                                                    {nearby.setorNome}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-0.5">
                                                    {nearby.operacao.toUpperCase()}
                                                </div>
                                            </div>
                                            <div className="text-xs text-blue-400 whitespace-nowrap ml-2">
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

                    {isLoadingNearby && !isDetectingCity && (
                        <div className="mb-6 p-4 bg-gray-700 rounded-lg text-center">
                            <div className="flex items-center justify-center">
                                <svg className="animate-spin h-5 w-5 text-blue-400 mr-2" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="text-sm text-gray-300">Buscando setores próximos...</span>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Operação */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Operação
                            </label>
                            <select
                                value={operacao}
                                onChange={(e) => setOperacao(e.target.value)}
                                disabled={isLoading.operacoes}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                <option value="">
                                    {isLoading.operacoes ? 'Carregando...' : '-- Selecione a Operação --'}
                                </option>
                                {operacoes.map((op) => (
                                    <option key={op} value={op}>
                                        {op.charAt(0).toUpperCase() + op.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Cidade */}
                        <ModalSearchableSelect
                            label="Cidade"
                            value={cidade}
                            onChange={setCidade}
                            options={cities}
                            disabled={!operacao || isLoading.cities}
                            loading={isLoading.cities}
                            placeholder="-- Selecione a Cidade --"
                        />

                        {/* Setor */}
                        <ModalSearchableSelect
                            label="Setor"
                            value={setor}
                            onChange={setSetor}
                            options={sectors}
                            disabled={!cidade || isLoading.sectors}
                            loading={isLoading.sectors}
                            placeholder="-- Selecione o Setor --"
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!isValid}
                        className="w-full mt-6 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-white font-medium transition-colors duration-200"
                    >
                        Visualizar Setor
                    </button>

                    <p className="text-xs text-gray-500 text-center mt-4">
                        Preencha todos os campos para visualizar o mapa
                    </p>
                </div>
            </div>
        </div>
    );
};
