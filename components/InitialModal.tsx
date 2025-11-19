import React, { useState, useEffect, useRef } from 'react';
import { getOperacoes, getCitiesByOperacao, getSectorsByOperacaoAndCity, getNearbySectorsByOperation, detectUserCity } from '../services/firebaseService';
import type { City, Sector } from '../types';
import type { NearbySector } from '../utils/geoUtils';

interface InitialModalProps {
    onSubmit: (operacao: string, cidade: string, setor: string, setorNome: string) => void;
    onClose?: () => void;
    userPosition?: { lat: number; lng: number } | null;
    // Callbacks para expor estados ao parent (App.tsx) para o Snackbar
    onDetectingCityChange?: (isDetecting: boolean) => void;
    onDetectedCityChange?: (cityName: string | null) => void;
    onLoadingNearbyChange?: (isLoading: boolean) => void;
    onNearbySectorsChange?: (sectors: NearbySector[]) => void;
    onOperacaoChange?: (operacao: string) => void;
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

export const InitialModal: React.FC<InitialModalProps> = ({ 
    onSubmit, 
    onClose, 
    userPosition,
    onDetectingCityChange,
    onDetectedCityChange,
    onLoadingNearbyChange,
    onNearbySectorsChange,
    onOperacaoChange,
}) => {
    const [operacao, setOperacao] = useState('');
    const [cidade, setCidade] = useState('');
    const [setor, setSetor] = useState('');
    const [operacoes, setOperacoes] = useState<string[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [nearbySectors, setNearbySectors] = useState<NearbySector[]>([]);
    const [detectedCityId, setDetectedCityId] = useState<string | null>(null);
    const [detectedCityName, setDetectedCityName] = useState<string | null>(null);
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

    // Detectar e pré-selecionar cidade quando a posição estiver disponível
    useEffect(() => {
        if (userPosition) {
            const detectAndSelectCity = async () => {
                setIsDetectingCity(true);
                onDetectingCityChange?.(true);
                try {
                    const cityInfo = await detectUserCity(userPosition);
                    
                    if (cityInfo) {
                        setDetectedCityId(cityInfo.city.id);
                        setDetectedCityName(cityInfo.city.nome);
                        onDetectedCityChange?.(cityInfo.city.nome);
                        // Auto-selecionar a cidade detectada
                        setCidade(cityInfo.city.id);
                        console.log(`✅ Cidade detectada e selecionada: ${cityInfo.city.nome}`);
                    } else {
                        setDetectedCityId(null);
                        setDetectedCityName(null);
                        onDetectedCityChange?.(null);
                    }
                } catch (error) {
                    console.error('Error detecting city:', error);
                    setDetectedCityId(null);
                    setDetectedCityName(null);
                    onDetectedCityChange?.(null);
                } finally {
                    setIsDetectingCity(false);
                    onDetectingCityChange?.(false);
                }
            };
            detectAndSelectCity();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userPosition]);

    // Buscar setores próximos - DESABILITADO TEMPORARIAMENTE
    // useEffect(() => {
    //     if (userPosition && operacao && cidade) {
    //         const loadNearbySectors = async () => {
    //             setIsLoadingNearby(true);
    //             onLoadingNearbyChange?.(true);
    //             setNearbySectors([]);
    //             onNearbySectorsChange?.([]);
    //             try {
    //                 const cityName = cities.find(c => c.id === cidade)?.nome || cidade;
    //                 const nearby = await getNearbySectorsByOperation(
    //                     userPosition,
    //                     operacao,
    //                     cidade,
    //                     cityName
    //                     // Usando valores padrão: 2km, 3 setores
    //                 );
    //                 setNearbySectors(nearby);
    //                 onNearbySectorsChange?.(nearby);
    //                 console.log(`✅ Encontrados ${nearby.length} setores próximos`);
    //             } catch (error) {
    //                 console.error('Error loading nearby sectors:', error);
    //                 setNearbySectors([]);
    //                 onNearbySectorsChange?.([]);
    //             } finally {
    //                 setIsLoadingNearby(false);
    //                 onLoadingNearbyChange?.(false);
    //             }
    //         };
    //         loadNearbySectors();
    //     } else {
    //         setNearbySectors([]);
    //         onNearbySectorsChange?.([]);
    //     }
    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, [userPosition, operacao, cidade, cities]);

    // Carregar cidades quando operação mudar
    useEffect(() => {
        onOperacaoChange?.(operacao);
        
        if (!operacao) {
            setCities([]);
            setCidade('');
            setSectors([]);
            setSetor('');
            return;
        }

        const loadCities = async () => {
            setIsLoading(prev => ({ ...prev, cities: true }));
            // Não limpar cidade se já foi detectada
            if (!detectedCityId) {
                setCidade('');
            }
            setSectors([]);
            setSetor('');
            try {
                const cityList = await getCitiesByOperacao(operacao);
                setCities(cityList);
                // Se temos cidade detectada, reselecionar
                if (detectedCityId) {
                    setCidade(detectedCityId);
                }
            } catch (error) {
                console.error('Error loading cities:', error);
                setCities([]);
            } finally {
                setIsLoading(prev => ({ ...prev, cities: false }));
            }
        };
        loadCities();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [operacao, detectedCityId]);

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
