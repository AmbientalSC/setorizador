// Script para fazer upload de todos os arquivos GeoJSON para o Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCO9UN0geTTGjwiMYEhnUo5WJr7evuN2_g",
    authDomain: "setor-mapa.firebaseapp.com",
    projectId: "setor-mapa",
    storageBucket: "setor-mapa.firebasestorage.app",
    messagingSenderId: "914753512067",
    appId: "1:914753512067:web:0ec2b4bb84aec9f00cb1b6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function uploadGeoJSON(filePath, fileName) {
    try {
        console.log(`\n📂 Processando: ${fileName}`);

        // Ler arquivo GeoJSON
        const fileContent = readFileSync(filePath, 'utf-8');
        const geoJSON = JSON.parse(fileContent);

        if (!geoJSON.features || geoJSON.features.length === 0) {
            console.log(`⚠️  Arquivo vazio, pulando: ${fileName}`);
            return;
        }

        // Extrair informações do primeiro feature
        const firstFeature = geoJSON.features[0];
        const cityName = firstFeature.properties?.FILIAL;

        if (!cityName) {
            console.log(`⚠️  FILIAL não encontrada, pulando: ${fileName}`);
            return;
        }

        const cityId = cityName.toLowerCase().replace(/\s+/g, '_');

        // Agrupar features por setor
        const sectorsMap = new Map();

        for (const feature of geoJSON.features) {
            const sectorName = feature.properties?.SETOR;
            if (sectorName) {
                if (!sectorsMap.has(sectorName)) {
                    sectorsMap.set(sectorName, []);
                }
                sectorsMap.get(sectorName).push(feature);
            }
        }

        if (sectorsMap.size === 0) {
            console.log(`⚠️  Nenhum setor encontrado, pulando: ${fileName}`);
            return;
        }

        console.log(`📍 Cidade: ${cityName} (${cityId})`);
        console.log(`📊 Setores encontrados: ${sectorsMap.size}`);

        // Preparar lista de setores
        const setoresDisponiveis = Array.from(sectorsMap.keys()).sort();

        // Atualizar documento da cidade
        const cityRef = doc(db, 'cidades', cityId);
        await setDoc(cityRef, {
            nome: cityName,
            setoresDisponiveis
        }, { merge: true });

        console.log(`✅ Cidade atualizada: ${cityName}`);

        // Upload de cada setor
        let count = 0;
        for (const [sectorName, features] of sectorsMap.entries()) {
            const sectorRef = doc(db, 'cidades', cityId, 'setores', sectorName);
            await setDoc(sectorRef, {
                nome: sectorName,
                geoJSON: JSON.stringify({
                    type: 'FeatureCollection',
                    features: features,
                }),
            });
            count++;
            process.stdout.write(`\r   Setores enviados: ${count}/${sectorsMap.size}`);
        }

        console.log(`\n✅ Concluído: ${fileName} - ${sectorsMap.size} setores enviados`);

    } catch (error) {
        console.error(`❌ Erro ao processar ${fileName}:`, error.message);
    }
}

async function uploadAllGeoJSON() {
    const cidadesDir = './cidades';

    console.log('🚀 Iniciando upload de arquivos GeoJSON...\n');

    try {
        // Ler todos os arquivos da pasta
        const files = readdirSync(cidadesDir);

        // Filtrar apenas arquivos .geojson (excluindo .backup)
        const geoJsonFiles = files.filter(f =>
            f.endsWith('.geojson') && !f.endsWith('.backup')
        );

        console.log(`📁 Total de arquivos encontrados: ${geoJsonFiles.length}\n`);

        // Upload sequencial para evitar sobrecarga
        for (const file of geoJsonFiles) {
            const filePath = join(cidadesDir, file);
            await uploadGeoJSON(filePath, file);

            // Pequeno delay entre uploads
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('\n\n🎉 Upload concluído com sucesso!');
        console.log('✨ Todos os arquivos foram processados.');

    } catch (error) {
        console.error('❌ Erro fatal:', error);
    }

    process.exit(0);
}

// Executar
uploadAllGeoJSON();
