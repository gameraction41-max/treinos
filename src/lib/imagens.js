// Fotos dos exercícios: tiradas na hora ou escolhidas da galeria, reduzidas para
// no máximo 800 px e salvas numa pasta interna do app. No banco vai só o caminho.
import { Capacitor } from '@capacitor/core';

const MAX = 800;
const PASTA = 'exercicios';
const cache = new Map();

function carregarImagem(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível abrir a imagem'));
    img.src = src;
  });
}

async function comprimir(src) {
  const img = await carregarImagem(src);
  const escala = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * escala);
  const h = Math.round(img.naturalHeight * escala);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.75);
}

async function salvar(dataUrl) {
  if (!Capacitor.isNativePlatform()) return dataUrl; // navegador: guarda a imagem inteira no banco
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const path = `${PASTA}/ex-${Date.now()}.jpg`;
  await Filesystem.writeFile({
    path,
    data: dataUrl.split(',')[1],
    directory: Directory.Data,
    recursive: true,
  });
  return path;
}

function escolherArquivoNoNavegador() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const f = input.files?.[0];
      resolve(f ? URL.createObjectURL(f) : null);
    };
    input.click();
  });
}

// origem: 'camera' | 'galeria'. Retorna o caminho salvo, ou null se cancelou.
export async function novaFoto(origem) {
  let src = null;
  try {
    if (Capacitor.isNativePlatform()) {
      const { Camera, MediaTypeSelection } = await import('@capacitor/camera');
      if (origem === 'camera') {
        const r = await Camera.takePhoto({ quality: 85 });
        src = r.webPath || (r.uri && Capacitor.convertFileSrc(r.uri));
      } else {
        const r = await Camera.chooseFromGallery({ mediaType: MediaTypeSelection.Photo, limit: 1 });
        const m = r.results?.[0];
        src = m && (m.webPath || (m.uri && Capacitor.convertFileSrc(m.uri)));
      }
    } else {
      src = await escolherArquivoNoNavegador();
    }
  } catch (err) {
    // Cancelar a câmera ou a galeria também cai aqui.
    if (/cancel/i.test(String(err?.message || err))) return null;
    throw err;
  }
  if (!src) return null;
  return salvar(await comprimir(src));
}

export async function srcDaImagem(caminho) {
  if (!caminho) return null;
  if (caminho.startsWith('data:') || caminho.startsWith('http')) return caminho;
  if (caminho.startsWith('app:')) return `./${caminho.slice(4)}`; // foto que vem com o app
  if (cache.has(caminho)) return cache.get(caminho);
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { uri } = await Filesystem.getUri({ path: caminho, directory: Directory.Data });
  const src = Capacitor.convertFileSrc(uri);
  cache.set(caminho, src);
  return src;
}

export async function apagarFoto(caminho) {
  if (!caminho || caminho.startsWith('data:') || caminho.startsWith('app:') || !Capacitor.isNativePlatform()) return;
  cache.delete(caminho);
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  await Filesystem.deleteFile({ path: caminho, directory: Directory.Data }).catch(() => {});
}
