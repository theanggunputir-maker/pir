import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  Download, 
  Camera, 
  Package, 
  ArrowRight, 
  Video, 
  Hand, 
  Smartphone, 
  ChevronLeft,
  Layout,
  Layers,
  CheckCircle2,
  Monitor,
  Loader2,
  Aperture,
  X,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  Eye,
  Copy,
  FileText,
  Volume2,
  Wand2,
  PlayCircle,
  Mic,
  ExternalLink,
  Archive,
  RotateCcw,
  BookOpen
} from 'lucide-react';

const apiKey = ""; // Environment handles this
const GENERATIVE_MODEL = "gemini-2.5-flash-image-preview";
const TEXT_MODEL = "gemini-2.5-flash-preview-09-2025"; 
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

// --- UTILS & COMPONENTS ---

const fetchWithRetry = async (url, options) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i <= delays.length; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (i === delays.length) return response; 
    } catch (error) {
      if (i === delays.length) throw error; 
    }
    if (i < delays.length) {
      await new Promise(res => setTimeout(res, delays[i]));
    }
  }
};

const playClick = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
};

const safeCopyToClipboard = (text) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try { document.execCommand('copy'); } catch (err) { console.error('Fallback copy failed', err); }
  document.body.removeChild(textArea);
};

const processImageForDownload = (base64, ratioStr) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let targetRatio;
      if (ratioStr === '16:9') targetRatio = 16/9;
      else if (ratioStr === '9:16') targetRatio = 9/16;
      else targetRatio = 1;

      const srcRatio = img.width / img.height;
      let renderWidth, renderHeight, offsetX, offsetY;

      if (srcRatio > targetRatio) {
        renderHeight = img.height;
        renderWidth = img.height * targetRatio;
        offsetX = (img.width - renderWidth) / 2;
        offsetY = 0;
      } else {
        renderWidth = img.width;
        renderHeight = img.width / targetRatio;
        offsetX = 0;
        if (targetRatio > 1) { offsetY = (img.height - renderHeight) / 2; } 
        else { offsetY = (img.height - renderHeight) * 0.1; }
      }

      canvas.width = Math.floor(renderWidth);
      canvas.height = Math.floor(renderHeight);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = base64;
  });
};

// --- AUDIO POST-PROCESSING ---
const writeString = (view, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const base64ToWavUrl = (base64PCM) => {
  const binaryString = window.atob(base64PCM);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = bytes.length;
  
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); 
  view.setUint16(20, 1, true); 
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const pcmData = new Uint8Array(buffer, 44);
  pcmData.set(bytes);

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

// --- LOGO COMPONENT ---
const PearLogo = ({ className }) => (
  <svg viewBox="0 0 100 120" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <mask id="biteMask">
        <rect width="100" height="120" fill="white" />
        <circle cx="95" cy="82" r="22" fill="black" />
      </mask>
    </defs>
    {/* Leaf */}
    <path d="M 50 28 C 45 15 55 2 68 2 C 70 18 55 28 50 28 Z" fill="currentColor" />
    {/* Pear Body with bite */}
    <path d="M 45 32 C 30 32 30 55 35 65 C 15 75 15 110 35 115 C 42 117 58 117 65 115 C 85 110 85 75 65 65 C 70 55 70 32 55 32 Z" fill="currentColor" mask="url(#biteMask)" />
  </svg>
);

// --- PROMPT ENGINE LOGIC ---

const IDENTITY_LOCK = "CRITICAL IDENTITY LOCK: The person MUST have the EXACT same face, facial structure, hair, skin tone, and body proportions as the person in IMAGE 1. This is the exact same person. Do NOT change their identity, ethnicity, or body type. Clone their physical appearance perfectly.";

const getModeLogic = (modeId, index, productName, productDesc, background, ugcStyle = 'Handheld') => {
    let subjectPrompt = "";
    let negPrompt = "";
    let cameraLogic = "";
    let motionCamera = "";
    let lipSyncLogic = "AMBIENT: Mouth closed or natural breathing, no talking.";

    switch (modeId) {
        case 'ugc':
            if (ugcStyle === 'Vlog') {
                cameraLogic = "Shot on iPhone 15 Pro Max front camera. Raw unedited vlog style. Wide angle lens, harsh directional sunlight or strong room light. Zero post-processing.";
                motionCamera = "Smooth handheld tracking shot, natural forward movement. Model walking and talking.";
            } else if (ugcStyle === 'Tripod') {
                cameraLogic = "Shot on iPhone 15 Pro Max mounted on a simple tripod. Raw unedited smartphone photo, single harsh directional light source creating distinct shadows, authentic everyday creator setup.";
                motionCamera = "Perfectly static camera on a tripod, no movement.";
            } else {
                cameraLogic = "HANDHELD SELFIE STYLE. Shot on iPhone 15 Pro Max front camera. Candid framing, hard flash or harsh direct sunlight, authentic raw social media snapshot.";
                motionCamera = "Slight natural handheld camera shake.";
            }
            
            subjectPrompt = `RAW AUTHENTIC UGC PHOTO (${cameraLogic.split('.')[0]}). Model facing camera naturally. Candid mid-sentence expression. Model casually interacting with ${productName} (${productDesc}) in an everyday setting. CRITICAL: Extremely realistic human skin texture, visible pores, subtle blemishes, unedited natural look. Single harsh light casting distinct, realistic shadows for 3D depth. Real-world lived-in background, no studio setup.`;
            negPrompt = "studio lighting, softbox, flat lighting, professional photography, DSLR, perfect smooth plastic skin, beauty filter, airbrushed, over-polished, cinematic lighting, 3d render, illustration.";
            lipSyncLogic = "LIP-SYNC: Model is speaking, mouth moving precisely to dialogue: '[SCRIPT_SCENE_TERSEBUT]'.";
            break;

        case 'commercial':
            cameraLogic = "Professional high-end commercial product photography. Shot on Hasselblad medium format. Single harsh directional spotlight, deep striking shadows, crisp sharp details, highly polished catalog aesthetic, 8k resolution.";
            subjectPrompt = `AWARD-WINNING COMMERCIAL SHOT. Masterpiece photography. Model looking pristine and perfectly styled, elegantly presenting ${productName} (${productDesc}). The product is heroically displayed with distinct shadows for 3D dimensionality, high contrast, and hyper-realistic textures. Clean, aesthetic background.`;
            negPrompt = "Amateur, smartphone photo, messy background, low quality, flat lighting, softbox, grainy, blurry, casual everyday lighting, distorted, bad anatomy, ugly, candid, snapshot, text, watermark.";
            motionCamera = "Smooth cinematic slider movement, slow motion, showcasing the product elegantly.";
            lipSyncLogic = "LIP-SYNC: Professional commercial delivery, smiling while speaking dialogue: '[SCRIPT_SCENE_TERSEBUT]'.";
            break;

        case 'mirror':
            cameraLogic = "Authentic mirror selfie. Shot on iPhone 15 Pro. Harsh directional room light or hard flash creating deep shadows, photorealistic.";
            subjectPrompt = `RAW MIRROR SELFIE PHOTO. Model standing in front of a mirror taking a mirror selfie with a smartphone. Model is stylishly showcasing ${productName} (${productDesc}). Trendy OOTD aesthetic. Real skin texture, unedited look. Single harsh light creating bold 3D dimensionality. Mirror reflection visible.`;
            negPrompt = "Flat lighting, soft ambient light, TV commercial look, amateur, basic white background, 3d render, illustration, not a mirror selfie, missing phone.";
            motionCamera = "Slight natural handheld camera shake, mimicking a mirror selfie recording.";
            lipSyncLogic = "AMBIENT: Casual posing in the mirror, natural breathing, no talking.";
            break;

        case 'pov':
            cameraLogic = "Authentic everyday first-person POV, shot on an iPhone 15, looking down, harsh directional lighting casting distinct hand shadows, photorealistic.";
            subjectPrompt = `RAW FIRST-PERSON POV SHOT. Authentic everyday lifestyle. Only hands visible naturally holding or unboxing ${productName} (${productDesc}). Shot from user's eye-level looking down at hands. Single harsh directional light, distinct hard shadows. NO FACES, NO BODIES. Real skin texture, highly detailed macro focus on product. ABSOLUTELY NO TEXT OR UI.`;
            negPrompt = "Face, head, hair, eyes, mouth, neck, torso, legs, feet, full body, flat lighting, over-rendered, artificial studio lighting, highly polished professional shot, 3D render, illustration, painting, text, typography, watermark, UI.";
            motionCamera = "Authentic first-person POV, slight natural smartphone camera shake, looking down. Pair of hands naturally interacting with the product.";
            break;
            
        default:
            cameraLogic = "Standard high quality camera setup.";
            subjectPrompt = `High quality photorealistic shot of model with ${productName} (${productDesc}).`;
            negPrompt = "Distorted, blurry, illustration, 3d.";
            motionCamera = "Static.";
            break;
    }

    return { subjectPrompt, negPrompt, cameraLogic, motionCamera, lipSyncLogic };
};

// --- COMPONENTS ---

const GeneratingState = ({ index }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/80 backdrop-blur-sm z-20 transition-all duration-500">
      <div className="absolute w-64 h-64 bg-green-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative w-12 h-12">
           <div className="absolute inset-0 rounded-full border-[1px] border-white/5" />
           <div className="absolute inset-0 rounded-full border-t-[1px] border-emerald-400 animate-[spin_1.5s_linear_infinite]" />
           <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-1 h-1 bg-emerald-300 rounded-full animate-ping" />
           </div>
        </div>
        <div className="text-center space-y-3">
          <p className="text-[10px] font-bold tracking-[0.4em] text-white uppercase animate-pulse">Rendering</p>
          <div className="flex items-center justify-center gap-3 opacity-50">
             <div className="w-3 h-px bg-gradient-to-r from-transparent to-emerald-400" />
             <p className="text-[9px] font-medium tracking-widest text-emerald-200 uppercase font-mono">Scene {String(index + 1).padStart(2, '0')}</p>
             <div className="w-3 h-px bg-gradient-to-l from-transparent to-emerald-400" />
          </div>
        </div>
      </div>
  </div>
);

const LayoutWrapper = ({ children, className = "" }) => (
  <div className={`min-h-screen bg-gray-800 text-slate-100 font-sans selection:bg-emerald-900 selection:text-white overflow-x-hidden ${className}`}>
    {}
    {/* Premium Dark Green & Emerald Gradient Orbs */}
    <div className="fixed top-[-10%] left-[-10%] w-[70%] h-[40%] rounded-full bg-green-600/15 blur-[120px] md:blur-[150px] pointer-events-none transform translate-z-0"></div>
    <div className="fixed bottom-[-10%] right-[-10%] w-[70%] h-[40%] rounded-full bg-teal-500/10 blur-[120px] md:blur-[150px] pointer-events-none transform translate-z-0"></div>
    <div className="fixed inset-0 opacity-[0.04] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
    <div className="relative z-10 w-full h-full flex flex-col min-h-screen">
      {children}
    </div>
  </div>
);

const Navbar = ({ onBack, onViewResult, onReset }) => (
  <div className="absolute top-0 left-0 right-0 z-50 px-4 md:px-8 py-4 md:py-6 flex items-center justify-between pointer-events-none bg-gradient-to-b from-gray-800/90 to-transparent">
    {}
    <div className="flex items-center gap-3 pointer-events-auto">
      <PearLogo className="w-10 h-10 md:w-12 md:h-12 text-black bg-white p-2 rounded-xl shadow-lg border border-white/20" />
      <div className="hidden md:flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold tracking-tight text-lg leading-none text-white uppercase">PIR PROJEK</span>
          <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-green-600 to-emerald-500 text-[8px] font-bold text-white tracking-widest uppercase leading-none">v6.1</span>
        </div>
        <span className="text-[10px] text-zinc-400 tracking-widest uppercase leading-none">EASY TO USE</span>
      </div>
      <div className="flex items-center gap-2 md:hidden">
        <span className="font-bold tracking-tight text-sm text-white uppercase">PIR PROJEK</span>
        <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-green-600 to-emerald-500 text-[8px] font-bold text-white tracking-widest uppercase leading-none">v6.1</span>
      </div>
    </div>
    <div className="flex items-center gap-3 pointer-events-auto">
      {onViewResult && (
        <button 
          type="button"
          onClick={() => { playClick(); onViewResult(); }} 
          className="backdrop-blur-md bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-emerald-400 border border-green-500/50 px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:from-green-600 hover:to-emerald-600 hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
        >
          <Eye className="w-3 h-3" /> Result
        </button>
      )}
      {onReset && (
        <button 
          type="button"
          onClick={() => { playClick(); onReset(); }} 
          className="backdrop-blur-md bg-white/5 border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 text-xs font-medium uppercase tracking-widest hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 transition-all duration-300 group active:scale-95"
        >
          <RotateCcw className="w-3 h-3 group-hover:-rotate-180 transition-transform duration-500" /> Reset
        </button>
      )}
      {onBack && (
        <button 
          type="button"
          onClick={() => { playClick(); onBack(); }} 
          className="backdrop-blur-md bg-white/5 border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 text-xs font-medium uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-300 group active:scale-95"
        >
          <ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> Back
        </button>
      )}
    </div>
  </div>
);

const SectionTitle = ({ title, subtitle }) => (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
    <h2 className="text-3xl md:text-5xl font-light tracking-tight text-white mb-2">{title}</h2>
    {subtitle && <p className="text-zinc-500 text-sm md:text-lg font-light leading-relaxed max-w-xl">{subtitle}</p>}
  </div>
);

const UploadZone = ({ image, onClick, label, icon: Icon }) => (
  <div className="space-y-3 group">
    <div className="flex justify-between items-baseline px-1">
      <span className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase">{label}</span>
      {image && <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Ready</span>}
    </div>
    <div onClick={() => { playClick(); onClick(); }} className={`relative w-full aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 border border-white/5 bg-zinc-900/20 group-hover:border-green-500/30 group-hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] group-hover:bg-green-950/20`}>
      {image ? (
        <>
          <img src={image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700 scale-100 group-hover:scale-105" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-[2px]">
            <span className="px-4 py-2 rounded-full border border-green-400/50 bg-green-950/80 text-xs font-medium text-emerald-300 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.3)]">Change</span>
          </div>
          <div className="absolute bottom-2 right-2 md:hidden">
            <div className="bg-emerald-500 rounded-full p-1"><CheckCircle2 className="w-3 h-3 text-black" /></div>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 md:gap-6 p-4 text-center">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border border-white/5 flex items-center justify-center bg-white/5 text-zinc-500 group-hover:text-emerald-400 group-hover:border-emerald-500/30 group-hover:scale-110 transition-all duration-500 shadow-2xl">
            <Icon className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <p className="text-[10px] md:text-xs text-zinc-600 group-hover:text-emerald-300 font-medium tracking-wide transition-colors">TAP TO UPLOAD</p>
        </div>
      )}
    </div>
  </div>
);

const ButtonCTA = ({ onClick, children, disabled }) => (
  <button 
    type="button"
    onClick={() => { playClick(); onClick(); }} 
    disabled={disabled} 
    className={`relative overflow-hidden w-full py-4 md:py-5 px-8 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold text-xs md:text-sm tracking-widest uppercase rounded-full hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] border border-emerald-400/50`}
  >
    {children}
  </button>
);

const MODE_BACKGROUNDS = {
    ugc: [
        'Kamar Kosan Aesthetic (Lampu Warm White)',
        'Warkop Kekinian (Lampu Kuning Hangat)',
        'Teras Depan Rumah Cluster',
        'Kafe Aesthetic (Sore Hari)',
        'Lorong Minimarket',
        'Kabin Mobil Siang Hari'
    ],
    commercial: [
        'Studio Setup Polos (Latar Putih Bersih)',
        'Meja Marmer Elegan (Lampu Studio Cerah)',
        'Latar Pastel Estetik Minimalis',
        'Podium Display Produk Mewah',
        'Set Ruang Tamu Skandinavia Modern'
    ],
    mirror: [
        'Kamar Estetik (Cermin Full Body)',
        'Kamar Mandi Mewah (Cermin Wastafel)',
        'Fitting Room Mall (Cahaya Terang)',
        'Lift Aesthetic (Cermin Full)',
        'Studio Minimalis (Cermin Bulat Besar)'
    ],
    pov: [
        'Meja Kerja Kayu Jati (Suasana Kantor)',
        'Kasur Sprei Motif Lokal (Unboxing Paket)',
        'Di Atas Jok Motor Matic (Jalanan Komplek)',
        'Di Balik Setir Mobil (Background Jalanan)',
        'Meja Kafe Estetik (Dekat Jendela)'
    ]
};

const VOICES = [
    { id: 'Puck', name: 'Budi (Pria)' },
    { id: 'Kore', name: 'Ayu (Wanita)' },
    { id: 'Charon', name: 'Rio (Pria)' },
    { id: 'Zephyr', name: 'Indra (Pria)' },
    { id: 'Fenrir', name: 'Dedi (Pria Berat)' }
];

const TONES = [
    'Profesional', 'Antusias', 'Meyakinkan', 'Santai', 'Edukatif', 
    'Humor', 'Inspiratif', 'Serius', 'Dramatis'
];

// --- UGC SYSTEM PROMPT ---
const UGC_SYSTEM_PROMPT = `
# ROLE
Kamu adalah AI Creative UGC Storyboard Specialist yang bertugas membantu pengguna membuat konten UGC (User Generated Content) yang menarik, natural, dan memiliki potensi konversi tinggi untuk TikTok, Instagram Reels, YouTube Shorts, Facebook Reels, maupun marketplace.
Fokus utama adalah membuat storyboard yang mudah diproduksi oleh creator tanpa memerlukan alat yang rumit.

---
# OBJECTIVE
Ubah informasi produk menjadi konsep video UGC yang:
- Memiliki hook kuat dalam 3 detik pertama.
- Mempertahankan perhatian penonton.
- Menampilkan problem & solution.
- Menonjolkan manfaat produk.
- Terasa natural seperti pengalaman pribadi.
- Mendorong penonton melakukan CTA.

---
# WORKFLOW
Saat pengguna memberikan produk, lakukan langkah berikut.

## 1. Analisis Produk
Identifikasi:
- Nama produk, Jenis produk, Target market, Pain point, Value proposition, Unique Selling Point, Emotional selling point, Functional selling point.
Jika informasi kurang lengkap, buat asumsi yang masuk akal tanpa terlalu banyak bertanya.

## 2. Tentukan Angle
Pilih angle terbaik (misal: Problem Solution, Honest Review, Storytelling, dll). Pilih angle yang paling berpotensi viral.

## 3. Buat Hook
Berikan minimal 10 hook (Curiosity, Shock, Relatable, dll). Maksimal 12 kata per hook.

## 4. Storyboard
Susun storyboard. Format list/tabel dengan kolom: SCENE, VISUAL, DIALOG / VO, TEXT ON SCREEN, CAMERA ANGLE, DURATION, TRANSITION. (6-12 scene).

## 5. Script
Buat script natural seperti orang berbicara. Bahasa santai. Pola: Hook -> Problem -> Agitasi -> Solusi -> Benefit -> Proof -> CTA.

## 6. Shot List
Buat daftar shot (Wide, Close Up, POV, B-roll, dll).

## 7. Editing Suggestion
Rekomendasi sound effect, musik, subtitle, transisi.

## 8. Caption
Buat: 5 pendek, 5 storytelling, 5 soft selling, 5 hard selling.

## 9. CTA
Buat minimal 10 variasi CTA.

## 10. Hashtag
Niche, viral, produk, brand, FYP.

## 11. Variasi Konten
15 detik, 30 detik, 45 detik, 60 detik.

## 12. Platform Optimization
Sesuaikan output (TikTok = Hook cepat, jump cut, dll).

---
# STYLE
Selalu gunakan bahasa Indonesia yang natural. Hindari bahasa AI. Hindari bahasa formal. Gunakan gaya seperti content creator berpengalaman.

---
# OUTPUT FORMAT
Selalu gunakan format berikut.
# ANALISIS PRODUK
...
# TARGET AUDIENCE
...
# ANGLE
...
# 10 HOOK
...
# STORYBOARD
...
# SCRIPT
...
# SHOT LIST
...
# EDITING
...
# CAPTION
...
# CTA
...
# HASHTAG
...
# VERSI 15 DETIK
...
# VERSI 30 DETIK
...
# VERSI 60 DETIK
...

---
# RULES
- Jangan membuat klaim medis tanpa dasar.
- Jangan membuat janji yang tidak realistis.
- Fokus pada manfaat nyata.
- Jika informasi produk kurang, gunakan asumsi yang logis.
- Prioritaskan konten yang mudah direkam menggunakan smartphone.
- Hindari adegan yang membutuhkan produksi mahal.
- Selalu utamakan engagement, watch time, dan conversion.
`;

// --- MAIN APP COMPONENT ---

export default function App() {
  const [view, setView] = useState('welcome');
  const [selectedMode, setSelectedMode] = useState(null);
  
  // Data State
  const [modelImage, setModelImage] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const [productName, setProductName] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [dynamicBackgrounds, setDynamicBackgrounds] = useState(MODE_BACKGROUNDS.ugc);

  // Custom Background State
  const [bgType, setBgType] = useState('preset'); 
  const [customBg, setCustomBg] = useState("");

  // Flow State
  const [isAnalyzingProduct, setIsAnalyzingProduct] = useState(false);
  const [isProductConfirmed, setIsProductConfirmed] = useState(false);

  const [config, setConfig] = useState({
    background: MODE_BACKGROUNDS.ugc[0],
    ratio: '9:16',
    scenes: 4,
    ugcStyle: 'Handheld'
  });

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [sceneLoadings, setSceneLoadings] = useState({});
  const [scenePrompts, setScenePrompts] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [copiedStates, setCopiedStates] = useState({});

  // --- AUDIO STUDIO POPUP STATE ---
  const [isAudioStudioOpen, setIsAudioStudioOpen] = useState(false);
  const [isAudioStudioMinimized, setIsAudioStudioMinimized] = useState(false);

  const [voScript, setVoScript] = useState("");
  const [voDuration, setVoDuration] = useState("15s");
  const [voVoice, setVoVoice] = useState(VOICES[0].id);
  const [voTone, setVoTone] = useState(TONES[1]);
  const [voAudioUrl, setVoAudioUrl] = useState(null);
  const [isGeneratingVOScript, setIsGeneratingVOScript] = useState(false);
  const [isGeneratingVOAudio, setIsGeneratingVOAudio] = useState(false);

  // Marketing Blueprint State
  const [isBlueprintOpen, setIsBlueprintOpen] = useState(false);
  const [isBlueprintMinimized, setIsBlueprintMinimized] = useState(false);
  const [blueprintContent, setBlueprintContent] = useState("");
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
  
  // Video Generator External Links State
  const [isVideoGeneratorsOpen, setIsVideoGeneratorsOpen] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  // Set default default ke background custom (hitam dengan aksen hijau)
  useEffect(() => {
    if (view === 'mode-selection' || view === 'upload-setup') {
      const expensiveGreenBg = 'Latar Hitam Aksen Hijau Mewah (Premium Studio)';
      setBgType('custom');
      setCustomBg(expensiveGreenBg);
    }
  }, [view]);

  const modelInputRef = useRef(null);
  const productInputRef = useRef(null);

  const handleResetAndNew = () => {
    playClick();
    setSelectedMode(null);
    setModelImage(null);
    setProductImage(null);
    setProductName("");
    setProductDesc("");
    setIsProductConfirmed(false);
    setBgType('preset');
    setCustomBg("");
    setConfig({
      background: MODE_BACKGROUNDS.ugc[0],
      ratio: '9:16',
      scenes: 4,
      ugcStyle: 'Handheld'
    });
    setGeneratedImages([]);
    setSceneLoadings({});
    setScenePrompts({});
    setPreviewImage(null);
    setCopiedStates({});
    setVoScript("");
    setVoAudioUrl(null);
    setIsAudioStudioOpen(false);
    setIsAudioStudioMinimized(false);
    setIsBlueprintOpen(false);
    setIsBlueprintMinimized(false);
    setBlueprintContent("");
    setIsVideoGeneratorsOpen(false);
    setView('mode-selection');
  };

  const updateSceneData = (index, updates) => {
    setGeneratedImages(prev => {
        const newArr = [...prev];
        if (newArr[index]) {
            newArr[index] = { ...newArr[index], ...updates };
        }
        return newArr;
    });
  };

  const handleStart = () => {
    playClick();
    setView('mode-selection');
  };

  const getPromptForScene = (sceneData) => {
    if (!sceneData) return "";
    let contextLogic = "";
    if (sceneData.voActive) {
        if (sceneData.isBRoll) {
            contextLogic = `NARRATIVE VOICE-OVER: '${sceneData.voText}'. Product remains the main focus.`;
        } else {
            contextLogic = `LIP-SYNC: Model is speaking, mouth moving precisely to dialogue: '${sceneData.voText}'.`;
        }
    } else {
        contextLogic = sceneData.isBRoll ? "AMBIENT: No human visible, purely product focused." : "AMBIENT: Mouth closed or natural breathing, no talking.";
    }
    return `PROMPT: ${sceneData.videoMotion} CAMERA: ${sceneData.videoCamera} DETAILS: Photorealistic high-fidelity video generation. Maintain strict consistency with the provided image reference. CONTEXT: ${contextLogic} ENVIRONMENT: ${sceneData.activeBackground}. NEGATIVE: distortion, morphing, bad hands, text overlays.`;
  };

  const handleCopyPrompt = (index) => {
    playClick();
    const sceneData = generatedImages[index];
    if (!sceneData) return;

    const dynamicPrompt = getPromptForScene(sceneData);

    safeCopyToClipboard(dynamicPrompt);
    setCopiedStates(prev => ({ ...prev, [index]: true }));
    setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [index]: false }));
    }, 2000);
  };

  const analyzeProductImage = async (base64Image) => {
    setIsAnalyzingProduct(true);
    setProductName("Sedang menganalisis...");
    setProductDesc("AI sedang mengidentifikasi detail produk...");
    try {
        const imageBase64 = base64Image.split(',')[1];
        const modeTitle = selectedMode?.title || 'Komersial';
        const systemPrompt = `
        Tugas Anda adalah menganalisis gambar produk dan mengembalikan HANYA format JSON valid.
        1. "productName": Identifikasi produk, maksimal 3 kata (Bahasa Indonesia).
        2. "productDesc": Deskripsi SANGAT RINGKAS (kategori, merek, warna/ciri menonjol).
        3. "backgrounds": Array berisi 7 rekomendasi latar/background yang eksklusif & estetik untuk sesi ${modeTitle} produk tersebut di Indonesia.
        
        Contoh output:
        {
          "productName": "Sepatu Lari Nike",
          "productDesc": "Sepatu lari Nike Air Max warna putih dan biru.",
          "backgrounds": ["Trek Lari Senayan", "Jalanan Sudirman", "Studio Putih", "Teras Cafe", "Ruang Tamu Estetik", "Track Urban", "Taman Kota"]
        }
        `;

        const payload = {
            contents: [{
                parts: [
                    { text: systemPrompt },
                    { inlineData: { mimeType: "image/png", data: imageBase64 } }
                ]
            }],
            generationConfig: { 
                responseMimeType: "application/json"
            }
        };

        const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
                const data = JSON.parse(text);
                setProductName(data.productName || "Produk Terdeteksi");
                setProductDesc(data.productDesc || "Detail produk.");
                const baseBgs = selectedMode ? MODE_BACKGROUNDS[selectedMode.id] : MODE_BACKGROUNDS.ugc;
                if (data.backgrounds && Array.isArray(data.backgrounds) && data.backgrounds.length > 0) {
                    const mergedBackgrounds = Array.from(new Set([...data.backgrounds, ...baseBgs]));
                    setDynamicBackgrounds(mergedBackgrounds);
                    setConfig(prev => ({...prev, background: data.backgrounds[0] || mergedBackgrounds[0]}));
                    setBgType('preset');
                } else {
                    setDynamicBackgrounds(baseBgs);
                    setConfig(prev => ({...prev, background: baseBgs[0]}));
                }
            } else {
                setProductName("Produk Manual"); setProductDesc("Isi manual");
            }
        } else {
            setProductName("Produk Manual"); setProductDesc("Isi manual");
        }
    } catch (error) {
        console.error("Product analysis error:", error);
        setProductName("Produk Manual"); setProductDesc("Gagal memuat AI. Silakan isi manual.");
        const baseBgs = selectedMode ? MODE_BACKGROUNDS[selectedMode.id] : MODE_BACKGROUNDS.ugc;
        setDynamicBackgrounds(baseBgs);
        setConfig(prev => ({...prev, background: baseBgs[0]}));
    } finally {
        setIsAnalyzingProduct(false);
    }
  };

  const handleProductUpload = (e) => {
    playClick();
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        setProductImage(base64);
        setIsProductConfirmed(false);
        analyzeProductImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleModelUpload = (e) => {
    playClick();
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setModelImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const modes = [
    { id: 'ugc', title: 'UGC Natural', icon: Smartphone, desc: 'Gaya kasual, otentik, direkam dengan smartphone' },
    { id: 'commercial', title: 'Commercial', icon: Package, desc: 'Kualitas studio profesional, bersih dan tajam' },
    { id: 'mirror', title: 'Mirror Check', icon: Camera, desc: 'Gaya mirror selfie, estetika OOTD di depan kaca' },
    { id: 'pov', title: 'POV Hand Review', icon: Hand, desc: 'Sudut pandang orang pertama (First-person view)' },
  ];

  const ratios = [
    { label: 'Portrait', sub: '9:16', value: '9:16' },
    { label: 'Square', sub: '1:1', value: '1:1' },
    { label: 'Landscape', sub: '16:9', value: '16:9' }
  ];

  const sceneCounts = [4, 8, 12];

  const generateScripts = async () => {
      let toneInstruction = "Tone: Profesional, jernih, persuasif.";
      let narrativeArc = "Follow a logical 6-act narrative arc: context -> problem -> discovery -> interaction -> transformation -> resolution.";

      if (selectedMode?.id === 'ugc') {
          toneInstruction = "Tone: Sangat natural, ngobrol santai seperti UGC TikTok/Reels sungguhan, tidak terkesan membaca script, gunakan bahasa sehari-hari yang sangat membumi.";
          narrativeArc = "Follow a highly organic, natural TikTok/Reels style narrative: casual hook -> relatable problem -> introducing product as an everyday find -> showing real usage -> genuine reaction -> soft recommendation.";
      } else if (selectedMode?.id === 'commercial') {
          toneInstruction = "Tone: Elegan, profesional, sangat meyakinkan seperti iklan TV premium.";
      } else if (selectedMode?.id === 'mirror') {
          toneInstruction = "Tone: Stylish, trendy, fokus pada penampilan (OOTD) dan kepercayaan diri (Mirror Selfie style).";
      } else if (selectedMode?.id === 'pov') {
          toneInstruction = "Tone: Review langsung, fokus pada detail produk, praktis, dan interaktif.";
      }

      const prompt = `Generate a JSON object with a single key 'scripts' containing an array of precisely ${config.scenes} strings for a storyboard about ${productName} (${productDesc}). ${narrativeArc} IMPORTANT: Use Bahasa Indonesia. ${toneInstruction} EXACT DURATION: Each script string MUST take exactly 6 to 8 seconds to speak. To achieve this, write STRICTLY between 18 and 25 words per string. Do not make it too short (< 15 words) or too long (> 25 words).`;

      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      };

      try {
          const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          if (response.ok) {
              const result = await response.json();
              const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
              const data = JSON.parse(text);
              if (data.scripts && data.scripts.length > 0) {
                  return data.scripts;
              }
          }
      } catch (err) {
          console.error("Script gen error", err);
      }
      
      return Array.from({ length: config.scenes }).map((_, i) => `Scene ${i+1}: Narasi default untuk ${productName}.`);
  };

  const generateVisual = async () => {
    playClick(); 
    setIsGenerating(true);
    setGeneratedImages(new Array(config.scenes).fill(null)); 
    setSceneLoadings({});
    setScenePrompts({});
    setCopiedStates({});
    setView('result');

    try {
      const activeBackground = bgType === 'custom' ? (customBg || 'Studio Foto Polos') : config.background;
      const scriptsArray = await generateScripts();

      const generateSingleScene = async (index) => {
        try {
          const base64Model = modelImage ? modelImage.split(',')[1] : null;
          const scriptText = scriptsArray[index] || `Scene ${index+1}`;
          const isBRoll = (index % 3 === 2) && (index !== config.scenes - 1);
          
          let role = isBRoll ? "B-ROLL DETAIL" : `ACT ${index + 1}`;
          if (index === 0) role = "HOOK";
          if (index === config.scenes - 1) role = "CTA";

          const modeParams = getModeLogic(selectedMode?.id, index, productName, productDesc, activeBackground, config.ugcStyle);
          
          let finalSubjectPrompt = modeParams.subjectPrompt;
          let finalNegPrompt = modeParams.negPrompt;
          let diffusionPrompt = "";
          let videoMotion = modeParams.motionCamera;
          let videoCamera = modeParams.cameraLogic;

          // B-ROLL LOGIC PER MODE
          if (isBRoll) {
              if (selectedMode?.id === 'ugc') {
                  finalSubjectPrompt = `RAW LIFESTYLE B-ROLL PHOTO. Casual close-up of ${productName} (${productDesc}) held casually by hands or resting on a surface. Shot on iPhone 15 Pro Max. Background: ${activeBackground}. Single harsh directional light (like direct sunlight) creating strong distinct shadows. CRITICAL: Real human skin texture on hands, visible pores. NO FACES. Unedited, raw, candid.`;
                  finalNegPrompt = "Human face, eyes, mouth, floating product, overly stylized studio lighting, flat lighting, artificial look, 3d render, DSLR, softbox, professional macro, smooth plastic skin.";
                  videoMotion = "Slight natural handheld camera shake, showcasing the product.";
                  videoCamera = "Smartphone camera, close up.";
              } else if (selectedMode?.id === 'commercial') {
                  finalSubjectPrompt = `PREMIUM STUDIO B-ROLL. Masterpiece macro close-up of ${productName} (${productDesc}). Focus on premium texture and material details. Background: ${activeBackground}. Dramatic commercial lighting with a single harsh spotlight, distinct shadows, elegant reflections, 8k resolution. NO HUMAN FACES.`;
                  finalNegPrompt = "Human face, eyes, mouth, messy background, low quality, flat lighting, grainy, amateur, everyday lighting, blurry.";
                  videoMotion = "Smooth macro pan/slide over the product surface.";
                  videoCamera = "Macro Lens, sharp focus, high-end commercial style.";
              } else if (selectedMode?.id === 'mirror') {
                  finalSubjectPrompt = `RAW MIRROR SELFIE B-ROLL. Close-up of ${productName} (${productDesc}) reflected in a mirror. Held casually. Background: ${activeBackground}. Harsh directional room light creating distinct shadows, highly detailed textures. NO FACES.`;
                  finalNegPrompt = "Human face, flat lighting, lack of shadows, overexposed, clean commercial look, 3d render.";
                  videoMotion = "Slight handheld shake, focusing on the product in the mirror.";
                  videoCamera = "Smartphone camera, mirror reflection close up.";
              }
          }

          let globalNeg = ", text, words, letters, typography, watermark, signature, logo, brand name, subtitles, captions, text overlays, UI elements, illustration, painting, cartoon, anime, 3d render, CGI, unreal engine, deformed, bad anatomy, distorted, different face, morphed body, flat lighting, soft ambient light, lack of shadows, AI generated look, synthetic, plastic, generic AI face, overly smooth, midjourney style, washed out";
          if (['ugc', 'pov', 'mirror'].includes(selectedMode?.id)) {
              globalNeg += ", flawless perfect lighting, professional photography, softbox, studio flash, plastic skin";
          }
          finalNegPrompt += globalNeg;
          
          let rolePrefix = "PHOTOGRAPHY MASTERCLASS TASK:";
          let styling = "Hyper-realistic color processing. Single harsh directional light source creating deep, hard shadows and bold 3D dimensionality. ABSOLUTELY NO TEXT OR WATERMARKS.";
          let realismLaws = "MANDATORY: Must look like a real, actual photograph. Ultra-detailed, lifelike. NOT AI GENERATED. Include natural photographic imperfections and high-contrast depth. STRICTLY NO TEXT, NO UI, NO WATERMARKS ALLOWED IN THE IMAGE.";

          if (['ugc', 'pov', 'mirror'].includes(selectedMode?.id)) {
              rolePrefix = "RAW SMARTPHONE PHOTO TASK:";
              styling = "Authentic raw aesthetic. Single harsh directional light (like direct sunlight or hard smartphone flash) casting distinct, hard shadows for realistic depth. Shot on iPhone. ABSOLUTELY NO TEXT OR WATERMARKS.";
              realismLaws = "AUTHENTIC UGC REALISM: Must look EXACTLY like an unedited iPhone photo posted directly to social media. ZERO AI VIBE. CRITICAL: Highly detailed real human skin texture, visible pores, natural imperfections, distinct harsh lighting contrast. NO soft studio lights, NO beauty filters. STRICTLY NO TEXT, NO UI, NO WATERMARKS ALLOWED IN THE IMAGE.";
          } else if (selectedMode?.id === 'commercial') {
              rolePrefix = "HIGH-END COMMERCIAL PHOTOGRAPHY TASK:";
              styling = "Premium catalog aesthetic, razor-sharp details. Single harsh spotlight creating dramatic, deep shadows and striking 3D dimensionality. ABSOLUTELY NO TEXT OR WATERMARKS.";
          }

          const base64ProductRaw = productImage ? productImage.split(',')[1] : null;
          const hasModelActive = base64Model && !isBRoll && selectedMode?.id !== 'pov';
          
          let refInfo = "";
          let payloadParts = [];
          
          // Mengurutkan Gambar 1 (Model) dan Gambar 2 (Produk) sebelum teks prompt
          if (hasModelActive) {
              refInfo = "[CRITICAL] REFERENCE IMAGES: Image 1 = Base Model (Clone this exact face, hair, and body shape). Image 2 = Product Reference. ";
              payloadParts.push({ inlineData: { mimeType: "image/png", data: base64Model } });
              if (base64ProductRaw) payloadParts.push({ inlineData: { mimeType: "image/png", data: base64ProductRaw } });
          } else if (base64ProductRaw) {
              refInfo = "[CRITICAL] REFERENCE IMAGE: Image 1 = The EXACT Product. ";
              payloadParts.push({ inlineData: { mimeType: "image/png", data: base64ProductRaw } });
          }

          const currentIdentityLock = hasModelActive ? IDENTITY_LOCK : "";
          finalNegPrompt += ", different face, altered identity, unrecognizable person, random face";

          diffusionPrompt = `${refInfo}${rolePrefix} Scene ${index + 1}. ${scriptText}. ${styling} ${modeParams.cameraLogic}. ${finalSubjectPrompt} ENVIRONMENT: ${activeBackground}. ${realismLaws} ${currentIdentityLock} NEGATIVE: ${finalNegPrompt} Technical: ${config.ratio} format.`;

          payloadParts.push({ text: diffusionPrompt });

          const payload = {
            contents: [{ parts: payloadParts }],
            generationConfig: { responseModalities: ["IMAGE"], aspectRatio: config.ratio }
          };

          const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${GENERATIVE_MODEL}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response || !response.ok) {
              const errorText = response ? await response.text() : 'No response';
              throw new Error(`Generation failed: ${errorText}`);
          }

          const result = await response.json();
          const base64Output = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

          if (base64Output) {
            const imgSrc = `data:image/png;base64,${base64Output}`;
            const defaultVoActive = !isBRoll && (selectedMode?.id !== 'pov');
            
            const scenarioData = { 
                src: imgSrc, 
                role, 
                action: finalSubjectPrompt, 
                scriptHint: scriptText,
                videoMotion,
                videoCamera,
                activeBackground,
                isBRoll,
                voActive: defaultVoActive,
                voText: scriptText
            };
            
            setGeneratedImages(prev => {
               const newArr = [...prev];
               const updated = new Array(config.scenes).fill(null).map((_, i) => {
                  if (prev[i]) return prev[i];
                  if (i === index) return scenarioData;
                  return null;
               });
               return updated.map((item, i) => item || prev[i]);
            });
          }
        } catch (err) {
          console.error(`Scene ${index} failed:`, err);
        } 
      };

      for (let i = 0; i < config.scenes; i++) {
        await generateSingleScene(i);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateSingleScene = async (index) => {
    playClick();
    const revisionInstruction = scenePrompts[index] || "";
    const originalScenario = generatedImages[index]; 
    const activeBackground = bgType === 'custom' ? (customBg || 'Studio Foto Polos') : config.background;
    
    setSceneLoadings(prev => ({ ...prev, [index]: true }));

    try {
      const base64Model = modelImage ? modelImage.split(',')[1] : null;
      const base64ProductRaw = productImage ? productImage.split(',')[1] : null;

      const hasModelActive = base64Model && !originalScenario.isBRoll && selectedMode?.id !== 'pov';
      const currentIdentityLock = hasModelActive ? IDENTITY_LOCK : "";

      let revisionNegPrompt = "different face, altered identity, unrecognized person, random face, morphed body, text, words, letters, typography, watermark, signature, logo, brand name, subtitles, captions, text overlays, UI elements, illustration, painting, cartoon, 3d render, CGI, unreal engine, deformed, distorted, flat lighting, soft ambient light, lack of shadows, AI generated look, synthetic, plastic, generic AI face, overly smooth, midjourney style";
      if (['ugc', 'pov', 'mirror'].includes(selectedMode?.id)) {
          revisionNegPrompt += ", flawless perfect lighting, cinematic movie shot, professional photography, DSLR, 8k, high res, softbox, studio flash, plastic skin, beauty filter";
      }

      let rolePrefix = "PHOTOGRAPHY MASTERCLASS TASK:";
      let realismLaws = "MANDATORY: Must look like a real, actual photograph. Ultra-detailed, lifelike. NOT AI GENERATED. Include natural photographic imperfections and high-contrast depth with single harsh directional lighting. STRICTLY NO TEXT, NO UI, NO WATERMARKS ALLOWED IN THE IMAGE.";
      if (['ugc', 'pov', 'mirror'].includes(selectedMode?.id)) {
          rolePrefix = "RAW SMARTPHONE PHOTO TASK:";
          realismLaws = "AUTHENTIC UGC REALISM: Must look EXACTLY like an unedited iPhone photo. ZERO AI VIBE. CRITICAL: Highly detailed real human skin texture, visible pores. Single harsh directional light (like direct sunlight or hard flash) casting distinct, hard shadows for realistic depth. STRICTLY NO TEXT, NO UI, NO WATERMARKS ALLOWED IN THE IMAGE.";
      } else if (selectedMode?.id === 'commercial') {
          rolePrefix = "HIGH-END COMMERCIAL PHOTOGRAPHY TASK:";
          realismLaws = "MANDATORY: Premium catalog aesthetic. Single harsh spotlight creating dramatic, deep shadows and striking 3D dimensionality. STRICTLY NO TEXT, NO UI, NO WATERMARKS ALLOWED IN THE IMAGE.";
      }

      let refInfo = "";
      let payloadParts = [];
      
      if (hasModelActive) {
          refInfo = "[CRITICAL] REFERENCE IMAGES: Image 1 = Base Model (Clone this exact face, hair, and body shape). Image 2 = Product Reference. ";
          payloadParts.push({ inlineData: { mimeType: "image/png", data: base64Model } });
          if (base64ProductRaw) payloadParts.push({ inlineData: { mimeType: "image/png", data: base64ProductRaw } });
      } else if (base64ProductRaw) {
          refInfo = "[CRITICAL] REFERENCE IMAGE: Image 1 = The EXACT Product. ";
          payloadParts.push({ inlineData: { mimeType: "image/png", data: base64ProductRaw } });
      }

      const systemPrompt = `
      ${refInfo}
      ${rolePrefix} - REVISION MODE.
      Target: Regenerate Scene ${index + 1} (${originalScenario.role}).
      Product: ${productName} (${productDesc})
      User Instruction: ${revisionInstruction || "Improve lighting and composition."}
      Keep original action: ${originalScenario.action}. Background: ${activeBackground}.
      ${realismLaws}
      ${currentIdentityLock}
      CRITICAL NEGATIVE: ${revisionNegPrompt}.
      `;

      payloadParts.push({ text: systemPrompt });

      const payload = {
        contents: [{ parts: payloadParts }],
        generationConfig: { responseModalities: ["IMAGE"], aspectRatio: config.ratio }
      };

      const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${GENERATIVE_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response || !response.ok) {
          const errorText = response ? await response.text() : 'No response';
          throw new Error(`Generation failed: ${errorText}`);
      }

      const result = await response.json();
      const base64Output = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

      if (base64Output) {
        const imgSrc = `data:image/png;base64,${base64Output}`;
        setGeneratedImages(prev => {
          const newArr = [...prev];
          newArr[index] = { ...newArr[index], src: imgSrc }; 
          return newArr;
        });
        setScenePrompts(prev => ({ ...prev, [index]: "" }));
      }
    } catch (err) {
      console.error("Scene regeneration error:", err);
    } finally {
      setSceneLoadings(prev => ({ ...prev, [index]: false }));
    }
  };

  const downloadImage = async (imgSrc, index, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    playClick(); 
    if (!imgSrc) return;
    
    const croppedSrc = await processImageForDownload(imgSrc, config.ratio);
    
    try {
      const res = await fetch(croppedSrc);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `aksara-studio-scene-${index + 1}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error("Download failed, using fallback:", err);
      const link = document.createElement('a');
      link.href = croppedSrc;
      link.download = `aksara-studio-scene-${index + 1}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownloadAllZip = async () => {
      playClick();
      setIsDownloadingZip(true);
      try {
          // Memuat JSZip secara dinamis
          let JSZip = window.JSZip;
          if (!JSZip) {
              await new Promise((resolve, reject) => {
                  const script = document.createElement('script');
                  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
                  script.onload = () => resolve();
                  script.onerror = reject;
                  document.head.appendChild(script);
              });
              JSZip = window.JSZip;
          }

          const zip = new JSZip();

          for (let i = 0; i < generatedImages.length; i++) {
              const sceneData = generatedImages[i];
              if (!sceneData || !sceneData.src) continue;

              const folderName = `Scene_0${i + 1}`;
              const folder = zip.folder(folderName);

              // Simpan Gambar ke Folder
              const croppedBase64DataUrl = await processImageForDownload(sceneData.src, config.ratio);
              const base64Data = croppedBase64DataUrl.split(',')[1];
              folder.file(`${folderName}_Image.png`, base64Data, { base64: true });

              // Simpan Teks Prompt ke Folder
              const promptText = getPromptForScene(sceneData);
              folder.file(`${folderName}_Prompt.txt`, promptText);
          }

          const content = await zip.generateAsync({ type: 'blob' });
          const blobUrl = window.URL.createObjectURL(content);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `Aksara_Studio_Semua_Scene_${Date.now()}.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
      } catch (err) {
          console.error("Failed to generate ZIP", err);
      } finally {
          setIsDownloadingZip(false);
      }
  };

  const handleGenerateVOScript = async () => {
      playClick();
      setIsGeneratingVOScript(true);
      
      const prompt = `Buatkan naskah master voiceover gaya ${selectedMode?.title || 'Komersial'} untuk ${productName || 'Produk'}. Durasi: ${voDuration}. Bahasa Indonesia. Tuliskan naskahnya saja langsung tanpa tambahan judul, markdown, atau penjelasan.`;
      
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
      };

      try {
          const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          if (response && response.ok) {
              const result = await response.json();
              const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) setVoScript(text.trim());
          }
      } catch (err) {
          console.error("Master VO Script gen error", err);
      } finally {
          setIsGeneratingVOScript(false);
      }
  };

  const handleGenerateVOAudio = async () => {
      if (!voScript) return;
      playClick();
      setIsGeneratingVOAudio(true);
      setVoAudioUrl(null);

      const payload = {
        contents: [{
            parts: [{ text: `Bacakan dengan nada ${voTone}: ${voScript}` }]
        }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: voVoice
                    }
                }
            }
        }
      };

      try {
          const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if (response && response.ok) {
              const result = await response.json();
              const base64PCM = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
              if (base64PCM) {
                  const url = base64ToWavUrl(base64PCM);
                  setVoAudioUrl(url);
              }
          }
      } catch (err) {
          console.error("Audio generation failed:", err);
      } finally {
          setIsGeneratingVOAudio(false);
      }
  };

  const handleGenerateBlueprint = async () => {
    playClick();
    setIsGeneratingBlueprint(true);
    
    const prompt = `${UGC_SYSTEM_PROMPT}\n\n---\n\nBERIKUT ADALAH DATA PRODUKNYA UNTUK DIANALISIS:\nNama Produk: ${productName || 'Produk'}\nDeskripsi: ${productDesc || 'Tidak ada deskripsi spesifik.'}\n\nTolong hasilkan output Blueprint lengkap sesuai format yang diminta di rules Anda!`;
    
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
    };

    try {
        const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response && response.ok) {
            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) setBlueprintContent(text);
        }
    } catch (err) {
        console.error("Blueprint gen error", err);
        setBlueprintContent("Gagal memuat blueprint. Silakan coba lagi.");
    } finally {
        setIsGeneratingBlueprint(false);
    }
  };

  // Helper render text content
  const renderMarkdownText = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
        if (line.startsWith('# ')) return <h1 key={idx} className="text-xl md:text-2xl font-bold text-emerald-400 mt-8 mb-4 tracking-wide uppercase border-b border-emerald-500/20 pb-2">{line.replace('# ', '')}</h1>;
        if (line.startsWith('## ')) return <h2 key={idx} className="text-lg md:text-xl font-bold text-white mt-6 mb-3">{line.replace('## ', '')}</h2>;
        if (line.startsWith('### ')) return <h3 key={idx} className="text-base md:text-lg font-bold text-emerald-200 mt-4 mb-2">{line.replace('### ', '')}</h3>;
        if (line.startsWith('- ')) return <li key={idx} className="ml-5 mb-1 list-disc text-zinc-300 text-xs md:text-sm leading-relaxed">{line.replace('- ', '')}</li>;
        
        // Simple bold parser
        const parts = line.split(/(\*\*.*?\*\*)/g);
        const parsedLine = parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
            }
            return part;
        });

        return <p key={idx} className="mb-2 text-zinc-300 text-xs md:text-sm leading-relaxed min-h-[1rem]">{parsedLine}</p>;
    });
  };

  const renderContent = () => {
    switch (view) {
      case 'welcome':
        return (
          <LayoutWrapper>
            {}
            <div className="flex-grow flex flex-col items-center justify-center text-center relative w-full h-full min-h-screen px-6 overflow-hidden">
              <div className="absolute inset-0 z-0 pointer-events-none bg-gray-800 overflow-hidden">
                <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-green-600/15 rounded-full blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-emerald-500/10 rounded-full blur-[120px] animate-[pulse_10s_ease-in-out_infinite] delay-1000" />
                <div className="absolute top-[40%] left-[40%] transform -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[100px] animate-[pulse_12s_ease-in-out_infinite] delay-2000" />
                <div className="absolute inset-0 opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
              </div>
              <div className="relative z-10 flex flex-col items-center gap-12 animate-in fade-in zoom-in duration-1000">
                <div className="flex items-center justify-center gap-4 md:gap-6">
                  <PearLogo className="w-20 h-20 md:w-28 md:h-28 text-black bg-white p-4 rounded-2xl md:rounded-3xl shadow-[0_0_30px_rgba(255,255,255,0.15)] border border-white/20" />
                  <h1 className="text-7xl md:text-9xl font-semibold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-emerald-50 to-emerald-200/50 select-none drop-shadow-2xl">PIR DISINI</h1>
                </div>
                <button 
                  type="button"
                  onClick={handleStart} 
                  className="px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-full font-bold text-sm tracking-widest uppercase hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] border border-emerald-400/50"
                >
                  Mulai Studio
                </button>
              </div>
              <div className="absolute bottom-10 flex items-center gap-2 opacity-50 z-10">
                <PearLogo className="w-5 h-5 text-black bg-white p-1 rounded-md" />
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest">PIR PROJEK v6.1 - EASY TO USE</span>
              </div>
            </div>
          </LayoutWrapper>
        );

      case 'mode-selection':
        return (
          <LayoutWrapper>
            <Navbar onBack={() => setView('welcome')} onReset={handleResetAndNew} />
            <div className="flex-grow flex flex-col justify-center px-4 pt-32 pb-12 md:px-12 md:pt-40 lg:px-24">
              <div className="max-w-7xl mx-auto w-full">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-16 gap-6 border-b border-white/5 pb-8">
                  <SectionTitle title="Pilih Mode Visual" subtitle="Tentukan gaya estetika kampanye visual Anda." />
                  <div className="hidden md:flex items-center gap-3 text-zinc-500">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-white">01</span>
                    <div className="w-16 h-px bg-zinc-800"></div>
                    <span className="text-[10px] font-bold tracking-widest uppercase opacity-50">03</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-12 duration-1000 ease-out fill-mode-backwards">
                  {modes.map((mode, idx) => {
                    const CurrentIcon = mode.icon;
                    return (
                      <button 
                        key={mode.id} 
                        type="button"
                        onClick={() => { 
                          playClick(); 
                          setSelectedMode(mode); 
                          setDynamicBackgrounds(MODE_BACKGROUNDS[mode.id]);
                          setConfig(prev => ({
                              ...prev, 
                              background: MODE_BACKGROUNDS[mode.id][0]
                          }));
                          setView('upload-setup'); 
                        }} 
                        className="group relative flex flex-col justify-between h-72 md:h-80 p-8 rounded-3xl bg-zinc-900/20 border border-white/5 hover:border-green-500/30 hover:shadow-[0_0_20px_rgba(34,197,94,0.1)] transition-all duration-500 overflow-hidden text-left hover:bg-green-950/20"
                      >
                        <div className="absolute top-[-50%] right-[-50%] w-full h-full bg-green-500/5 blur-[80px] rounded-full group-hover:bg-emerald-500/10 transition-all duration-700 pointer-events-none transform translate-z-0"></div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                          <div className="flex justify-between items-start w-full">
                            <div className="w-14 h-14 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 group-hover:scale-105 transition-all duration-500 shadow-xl">
                              <CurrentIcon className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-mono text-zinc-700 group-hover:text-emerald-500 transition-colors">0{idx + 1}</span>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-xl md:text-2xl font-light text-white mb-2 leading-none tracking-tight group-hover:translate-x-1 transition-transform duration-300">{mode.title}</h3>
                              <p className="text-xs text-zinc-500 font-light leading-relaxed max-w-[90%] group-hover:text-emerald-200/70 transition-colors line-clamp-2">{mode.desc}</p>
                            </div>
                            <div className="flex items-center justify-between pt-6 border-t border-white/5 group-hover:border-green-500/20">
                              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-600 group-hover:text-emerald-400 transition-colors">Pilih Mode</span>
                              <div className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center bg-white/5 group-hover:bg-gradient-to-r group-hover:from-green-600 group-hover:to-emerald-500 group-hover:text-white group-hover:border-transparent transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0)] group-hover:shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                                 <ArrowRight className="w-3 h-3 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </LayoutWrapper>
        );

      case 'upload-setup':
        const isUploadComplete = (selectedMode?.id === 'pov' ? true : modelImage) && productImage;
        
        return (
          <LayoutWrapper>
            <Navbar onBack={() => setView('mode-selection')} onReset={handleResetAndNew} />
            <div className="flex-grow flex flex-col px-4 pt-32 pb-12 md:px-12 md:pt-40 lg:px-24">
               <div className="max-w-3xl mx-auto w-full flex flex-col gap-10">
                  <SectionTitle title="Aset Visual" subtitle={`Siapkan aset gambar untuk gaya ${selectedMode?.title}.`} />
                  
                  <div className={`grid gap-4 md:gap-8 ${selectedMode?.id === 'pov' ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-2'}`}>
                    {selectedMode?.id !== 'pov' && (
                      <UploadZone 
                        label="01. Base Model (Refernsi Wajah/Tubuh)" 
                        image={modelImage} 
                        onClick={() => modelInputRef.current?.click()} 
                        icon={Camera} 
                      />
                    )}
                    <UploadZone 
                      label={selectedMode?.id === 'pov' ? "01. Product Image" : "02. Product Image"} 
                      image={productImage} 
                      onClick={() => productInputRef.current?.click()} 
                      icon={Package} 
                    />
                  </div>
                  
                  <input type="file" ref={modelInputRef} onChange={handleModelUpload} className="hidden" accept="image/*" />
                  <input type="file" ref={productInputRef} onChange={handleProductUpload} className="hidden" accept="image/*" />

                  <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                      <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                             <FileText className="w-4 h-4" /> Detail Produk
                          </label>
                          {isAnalyzingProduct && (
                              <span className="text-[10px] text-emerald-400 flex items-center gap-2 animate-pulse">
                                  <Sparkles className="w-3 h-3" /> AI Analyzing...
                              </span>
                          )}
                      </div>
                      
                      <div className="space-y-3">
                          <input 
                              type="text"
                              value={productName}
                              onChange={(e) => setProductName(e.target.value)}
                              placeholder="Nama Produk (Misal: Kopi Susu Aren)"
                              className="w-full bg-slate-900/60 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-400 focus:shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all font-medium"
                          />
                          <textarea 
                              value={productDesc}
                              onChange={(e) => setProductDesc(e.target.value)}
                              placeholder="Unggah gambar produk agar AI dapat mendeteksi deskripsinya secara otomatis, atau ketik manual..."
                              className="w-full h-20 bg-slate-900/60 border border-white/10 rounded-xl p-3 text-sm text-zinc-400 focus:outline-none focus:border-emerald-400 focus:shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all resize-none"
                          />
                      </div>

                      <div className="flex justify-end pt-2">
                          <button 
                              type="button"
                              onClick={() => { playClick(); setIsProductConfirmed(true); }}
                              disabled={!productName || isProductConfirmed || isAnalyzingProduct}
                              className={`
                                  px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2
                                  ${isProductConfirmed 
                                      ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default' 
                                      : 'bg-gradient-to-r from-green-600 to-emerald-500 text-white hover:from-green-500 hover:to-emerald-400 border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'}
                                  disabled:opacity-50 disabled:cursor-not-allowed
                              `}
                          >
                              {isAnalyzingProduct ? (
                                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing</>
                              ) : isProductConfirmed ? (
                                  <><CheckCircle2 className="w-4 h-4" /> Confirmed</>
                              ) : (
                                  "Confirm Info"
                              )}
                          </button>
                      </div>
                  </div>

                  <div className="pt-4 pb-10">
                     <ButtonCTA 
                        disabled={!isUploadComplete || !isProductConfirmed || isAnalyzingProduct} 
                        onClick={() => setView('config')}
                     >
                        Lanjutkan
                     </ButtonCTA>
                     {!isProductConfirmed && isUploadComplete && !isAnalyzingProduct && (
                         <p className="text-center text-[10px] text-zinc-600 mt-3 animate-pulse">Mohon konfirmasi info produk untuk lanjut</p>
                     )}
                  </div>
               </div>
            </div>
          </LayoutWrapper>
        );

      case 'config':
        return (
          <LayoutWrapper>
            <Navbar 
              onBack={() => setView('upload-setup')} 
              onViewResult={generatedImages.some(img => img !== null) ? () => setView('result') : null}
              onReset={handleResetAndNew}
            />
            <div className="flex-grow flex flex-col px-4 pt-32 pb-12 md:px-12 md:pt-40 lg:px-24">
              <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
                <div className="lg:col-span-7 space-y-8 md:space-y-12">
                  <SectionTitle title="Konfigurasi Studio" subtitle="Sesuaikan pengaturan latar dan detail output visual." />
                  <div className="space-y-4 md:space-y-6">
                    <label className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      <Monitor className="w-3 h-3" /> Latar / Background (Rekomendasi AI)
                    </label>
                    <div className="relative group">
                      <select 
                        value={bgType === 'custom' ? 'CUSTOM' : config.background} 
                        onChange={(e) => { 
                          playClick(); 
                          if (e.target.value === 'CUSTOM') {
                            setBgType('custom');
                          } else {
                            setBgType('preset');
                            setConfig({...config, background: e.target.value}); 
                          }
                        }} 
                        className="w-full appearance-none bg-zinc-900/30 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white focus:outline-none focus:border-emerald-400 focus:shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all cursor-pointer font-medium hover:bg-zinc-900/50"
                      >
                        {dynamicBackgrounds.map(bg => (
                          <option key={bg} value={bg} className="bg-zinc-900 text-white py-2">{bg}</option>
                        ))}
                        <option value="CUSTOM" className="bg-zinc-800 text-emerald-400 font-bold">✨ Custom (Ketik Sendiri)...</option>
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                        <ChevronDown className="w-5 h-5" />
                      </div>
                    </div>
                    
                    {bgType === 'custom' && (
                      <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                        <input 
                          type="text"
                          placeholder="Contoh: 'Garasi rumah dengan lampu neon hijau' atau 'Kantin kampus siang hari'"
                          value={customBg}
                          onChange={(e) => setCustomBg(e.target.value)}
                          className="w-full bg-slate-900/60 border border-green-500/30 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-emerald-400 focus:shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all font-medium"
                          autoFocus
                        />
                      </div>
                    )}

                    {selectedMode?.id === 'ugc' && (
                      <div className="pt-6 mt-4 border-t border-white/5 space-y-4 animate-in fade-in">
                        <label className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                          <Video className="w-3 h-3" /> Gaya Kamera UGC
                        </label>
                        <p className="text-xs text-zinc-400">Pilih pergerakan dan komposisi kamera (hanya berlaku di mode UGC).</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {[
                            { id: 'Handheld', label: '📱 Handheld', desc: 'Gaya selfie, natural shake' },
                            { id: 'Tripod', label: '📸 Tripod', desc: 'Kamera statis & stabil' },
                            { id: 'Vlog', label: '🚶‍♂️ Vlog', desc: 'Dinamis, wide angle' }
                          ].map(style => (
                            <button
                              key={style.id}
                              type="button"
                              onClick={() => { playClick(); setConfig({...config, ugcStyle: style.id}); }}
                              className={`flex flex-col items-start p-4 rounded-xl border transition-all duration-300 text-left ${config.ugcStyle === style.id ? 'bg-green-900/20 border-green-400/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-black/20 border-white/5 hover:border-green-500/30'}`}
                            >
                              <span className={`text-sm font-bold mb-1 ${config.ugcStyle === style.id ? 'text-white' : 'text-zinc-300'}`}>{style.label}</span>
                              <span className={`text-[10px] ${config.ugcStyle === style.id ? 'text-emerald-200/80' : 'text-zinc-500'}`}>{style.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
                <div className="lg:col-span-5 space-y-6 md:space-y-10 lg:pt-24">
                  <div className="p-6 md:p-8 rounded-3xl border border-white/5 bg-zinc-900/20 backdrop-blur-md space-y-6 md:space-y-10">
                    <div className="space-y-4">
                      <label className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Layout className="w-3 h-3" /> Format Output
                      </label>
                      <div className="flex flex-col gap-2">
                        {ratios.map(r => (
                          <button 
                            key={r.value} 
                            type="button"
                            onClick={() => { playClick(); setConfig({...config, ratio: r.value}); }} 
                            className={`flex items-center justify-between px-4 py-3 md:px-5 md:py-4 rounded-xl border transition-all duration-300 ${config.ratio === r.value ? 'bg-green-600/20 border-green-400/50 text-emerald-300 shadow-inner' : 'bg-transparent border-white/5 text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}
                          >
                            <span className="text-[10px] md:text-xs font-medium uppercase tracking-wide">{r.label}</span>
                            <span className="text-[10px] font-mono opacity-50">{r.sub}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Layers className="w-3 h-3" /> Jumlah Scene
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {sceneCounts.map(count => (
                          <button 
                            key={count} 
                            type="button"
                            onClick={() => { playClick(); setConfig({...config, scenes: count}); }} 
                            className={`py-2 md:py-3 rounded-lg text-[10px] md:text-xs font-bold border transition-all duration-300 ${config.scenes === count ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white border-transparent shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-transparent border-white/5 text-zinc-500 hover:border-green-500/30 hover:text-emerald-300'}`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="pt-2 md:pt-4">
                      <ButtonCTA onClick={generateVisual}>Generate Visuals</ButtonCTA>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </LayoutWrapper>
        );

      case 'result':
        return (
          <LayoutWrapper className="h-screen flex flex-col overflow-hidden bg-gray-800">
            <div className="h-16 md:h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-gray-800/70 backdrop-blur-md z-30 shrink-0">
              <div className="flex items-center gap-4 md:gap-6 overflow-hidden">
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">Project</span>
                  <span className="text-xs md:text-sm font-medium text-white truncate">{selectedMode?.title} / {productName}</span>
                </div>
                <div className="hidden md:block h-8 w-px bg-white/10"></div>
                <div className="hidden md:flex items-center gap-4 text-xs text-zinc-400">
                  <span className="px-3 py-1 rounded-full border border-white/5 bg-white/5 max-w-[200px] truncate">
                    {bgType === 'custom' ? (customBg || 'Custom') : config.background}
                  </span>
                  <span className="px-3 py-1 rounded-full border border-white/5 bg-white/5">{config.ratio}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-4">
                {!isGenerating && (
                   <>
                    <button 
                      onClick={() => { playClick(); setIsBlueprintOpen(true); setIsBlueprintMinimized(false); }} 
                      className="relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white border border-blue-400/50 rounded-full text-[10px] md:text-xs font-bold tracking-widest uppercase hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] overflow-hidden group"
                    >
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 skew-x-12"></div>
                      <BookOpen className="w-3 h-3 md:w-4 md:h-4 relative z-10 group-hover:scale-110 transition-transform" /> 
                      <span className="hidden md:inline relative z-10 drop-shadow-md">UGC Blueprint</span>
                      <span className="md:hidden relative z-10 drop-shadow-md">Blueprint</span>
                    </button>

                    <button 
                      onClick={() => { playClick(); setIsAudioStudioOpen(true); setIsAudioStudioMinimized(false); }} 
                      className="relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 via-emerald-600 to-green-500 text-white border border-emerald-400/50 rounded-full text-[10px] md:text-xs font-bold tracking-widest uppercase hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] overflow-hidden group"
                    >
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 skew-x-12"></div>
                      <Volume2 className="w-3 h-3 md:w-4 md:h-4 relative z-10 group-hover:scale-110 transition-transform" /> 
                      <span className="hidden md:inline relative z-10 drop-shadow-md">Audio Studio</span>
                      <span className="md:hidden relative z-10 drop-shadow-md">Audio Studio</span>
                    </button>

                    <button onClick={() => { playClick(); setView('config'); }} className="flex items-center gap-1 p-2 md:p-0 text-[10px] md:text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-white transition-colors">
                       <ChevronLeft className="w-4 h-4 md:w-3 md:h-3" />
                       <span className="hidden md:inline">Kembali</span>
                    </button>
                    <button onClick={handleResetAndNew} className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-500 text-white text-[10px] md:text-xs font-bold tracking-widest uppercase rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-400/50">Buat Baru</button>
                   </>
                )}
              </div>
            </div>

            <div className="flex-grow relative overflow-y-auto custom-scrollbar">
              <div className="max-w-[1920px] mx-auto p-4 md:p-8 lg:p-12 pb-32">
                
                <div className={`grid gap-6 md:gap-8 ${config.scenes === 4 ? 'grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
                  {Array.from({ length: config.scenes }).map((_, index) => {
                    const sceneData = generatedImages[index]; 
                    const image = sceneData?.src;
                    const isLoadingThis = sceneLoadings[index] || (isGenerating && !image);
                    
                    return (
                      <div key={index} className="flex flex-col gap-4 group">
                        <div className={`relative rounded-xl overflow-hidden bg-zinc-900 border border-white/5 transition-all duration-500 ${config.ratio === '9:16' ? 'aspect-[9/16]' : config.ratio === '16:9' ? 'aspect-video' : 'aspect-square'} ${image ? 'hover:border-green-500/30' : ''}`}>
                          {image ? (
                            <>
                               {config.ratio === '16:9' ? (
                                  <img src={image} alt={`Output ${index}`} className={`w-full h-full object-cover object-center transition-all duration-700 ${isLoadingThis ? 'scale-105 blur-sm opacity-50' : 'group-hover:scale-105'}`} />
                               ) : (
                                  <img src={image} alt={`Output ${index}`} className={`w-full h-full object-cover object-top transition-all duration-700 ${isLoadingThis ? 'scale-105 blur-sm opacity-50' : 'group-hover:scale-105'}`} />
                               )}
                              
                              {isLoadingThis ? (
                                 <GeneratingState index={index} />
                              ) : (
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 z-20">
                                      <button 
                                        type="button"
                                        onClick={() => setPreviewImage(image)} 
                                        className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white hover:text-black hover:scale-110 transition-all text-white shadow-[0_0_15px_rgba(0,0,0,0.5)]" title="Preview Fullscreen"
                                      >
                                        <ZoomIn className="w-5 h-5" />
                                      </button>
                                  </div>
                              )}
                              
                              {sceneData?.role && (
                                  <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full z-20">
                                      <span className="text-[9px] font-bold text-white uppercase tracking-widest">{sceneData.role}</span>
                                  </div>
                              )}
                            </>
                          ) : (
                            <div className="absolute inset-0">
                              {isLoadingThis ? (
                                 <GeneratingState index={index} />
                              ) : (
                                 <div className="w-full h-full flex flex-col items-center justify-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5"></div>
                              )}
                            </div>
                          )}
                        </div>

                        {image && !isGenerating && (
                          <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 space-y-4">
                             <div className="flex items-center justify-between pb-3 border-b border-white/5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Scene 0{index + 1}</span>
                                <button type="button" onClick={(e) => downloadImage(image, index, e)} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 text-emerald-300 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wide hover:bg-emerald-600 hover:text-white hover:border-transparent transition-all shadow-[0_0_10px_rgba(16,185,129,0)] hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                                  <Download className="w-3 h-3" /> Unduh
                                </button>
                             </div>

                             <div className="space-y-4 pt-1">
                                 <div className="bg-green-950/40 border border-green-500/40 rounded-xl p-3.5 space-y-3 relative shadow-[0_0_15px_rgba(34,197,94,0.15)]">
                                    <div className="flex items-center gap-2">
                                      <Sparkles className="w-4 h-4 text-emerald-400" />
                                      <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">Revisi Visual AI</span>
                                    </div>
                                    <div className="relative group/input flex gap-2">
                                      <input 
                                        type="text" 
                                        disabled={isLoadingThis} 
                                        placeholder="Cth: Buat pencahayaan lebih terang..." 
                                        className="flex-grow bg-black/60 border border-green-500/30 rounded-lg pl-3 pr-3 py-2.5 text-xs text-white placeholder:text-emerald-200/30 focus:outline-none focus:border-emerald-400 focus:shadow-[0_0_10px_rgba(16,185,129,0.25)] transition-all disabled:opacity-50" 
                                        value={scenePrompts[index] || ""} 
                                        onChange={(e) => setScenePrompts(prev => ({...prev, [index]: e.target.value}))} 
                                        onKeyDown={(e) => e.key === 'Enter' && regenerateSingleScene(index)} 
                                      />
                                      <button 
                                        type="button" 
                                        onClick={() => regenerateSingleScene(index)} 
                                        disabled={isLoadingThis || !scenePrompts[index]} 
                                        className="px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-gradient-to-r from-green-600 to-emerald-500 text-white hover:from-green-500 hover:to-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                                      >
                                        {isLoadingThis ? <Loader2 className="w-4 h-4 animate-spin" /> : "Revisi"}
                                      </button>
                                    </div>
                                 </div>

                                 <div className="bg-black/30 p-3 rounded-lg border border-white/5 space-y-2 transition-all">
                                     <div className="flex items-center justify-between">
                                         <span className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors ${sceneData.voActive ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                             <Mic className="w-3 h-3"/> Voice Over {sceneData.voActive ? 'On' : 'Off'}
                                         </span>
                                         <label className="relative inline-flex items-center cursor-pointer">
                                           <input 
                                               type="checkbox" 
                                               className="sr-only peer" 
                                               checked={sceneData.voActive || false} 
                                               onChange={(e) => updateSceneData(index, { voActive: e.target.checked })} 
                                               disabled={isLoadingThis} 
                                           />
                                           <div className="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                                         </label>
                                     </div>
                                     
                                     {sceneData.voActive ? (
                                         <textarea 
                                             value={sceneData.voText || ""} 
                                             onChange={(e) => updateSceneData(index, { voText: e.target.value })}
                                             disabled={isLoadingThis}
                                             className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50 transition-all resize-none h-16 custom-scrollbar"
                                             placeholder="Ketik naskah Voice Over di sini..."
                                         />
                                     ) : (
                                         <div className="flex items-center justify-center py-2 bg-black/20 rounded-md border border-white/5 border-dashed">
                                             <p className="text-[10px] text-zinc-600 font-medium italic">Tanpa Voice Over (Hanya Ambience/BGM)</p>
                                         </div>
                                     )}
                                 </div>
                             </div>

                             <button 
                                  type="button" 
                                  onClick={() => handleCopyPrompt(index)} 
                                  className={`w-full py-2.5 border text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 group/copy ${copiedStates[index] ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-green-950/30 border-green-500/30 text-emerald-300 hover:bg-green-900/50 hover:text-white'}`}
                              >
                                  {copiedStates[index] ? (
                                      <>
                                          <CheckCircle2 className="w-3 h-3" /> Tersalin!
                                      </>
                                  ) : (
                                      <>
                                          <Copy className="w-3 h-3 group-hover/copy:scale-110 transition-transform" /> Copy Prompt Generasi Video
                                      </>
                                  )}
                             </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* TOMBOL AKSES VIDEO GENERATOR EXTERNAL */}
                {!isGenerating && generatedImages.some(img => img !== null) && (
                   <div className="mt-20 pt-10 border-t border-white/5 flex flex-col items-center gap-6 animate-in fade-in duration-700">
                       
                       <button 
                           onClick={handleDownloadAllZip}
                           disabled={isDownloadingZip}
                           className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-full text-xs font-bold tracking-widest uppercase text-white transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-400/50"
                       >
                           {isDownloadingZip ? (
                               <><Loader2 className="w-5 h-5 animate-spin" /> Memproses ZIP...</>
                           ) : (
                               <><Archive className="w-5 h-5" /> Download All Scene & Prompt (.ZIP)</>
                           )}
                       </button>

                       <button 
                           onClick={() => { playClick(); setIsVideoGeneratorsOpen(!isVideoGeneratorsOpen); }}
                           className="px-8 py-4 bg-slate-900/50 hover:bg-slate-800/80 border border-white/10 rounded-full text-xs font-bold tracking-widest uppercase text-white transition-all flex items-center gap-3 shadow-lg hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] hover:border-emerald-500/30"
                       >
                           <Video className="w-5 h-5 text-emerald-400" />
                           Akses Video Generator
                           {isVideoGeneratorsOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                       </button>

                       {isVideoGeneratorsOpen && (
                           <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center animate-in zoom-in-95 duration-300">
                               <a 
                                  href="https://www.meta.ai/" 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  onClick={playClick} 
                                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-900/40 to-green-900/40 border border-emerald-500/30 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest text-emerald-100 hover:from-emerald-600 hover:to-green-600 hover:text-white transition-all shadow-lg hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                               >
                                   <ExternalLink className="w-4 h-4" /> Meta AI
                               </a>
                               <a 
                                  href="https://grok.com/" 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  onClick={playClick} 
                                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 bg-zinc-900/60 border border-white/10 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest text-zinc-300 hover:bg-black hover:border-white/30 hover:text-white transition-all shadow-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                               >
                                   <ExternalLink className="w-4 h-4" /> Grok AI
                               </a>
                               <a 
                                  href="https://labs.google/fx/tools/flow" 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  onClick={playClick} 
                                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-emerald-500/30 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest text-emerald-100 hover:from-green-600 hover:to-emerald-600 hover:text-white transition-all shadow-lg hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                               >
                                   <ExternalLink className="w-4 h-4" /> Flow AI
                               </a>
                           </div>
                       )}
                   </div>
                )}
              </div>
            </div>

            {previewImage && (
              <div className="fixed inset-0 z-[100] bg-gray-800/95 flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
                <div 
                  className={`
                    relative overflow-hidden rounded-lg shadow-2xl transition-all flex items-center justify-center bg-zinc-900
                    ${config.ratio === '9:16' ? 'aspect-[9/16] h-full max-h-[90vh] w-auto' : ''}
                    ${config.ratio === '16:9' ? 'aspect-[16/9] w-full max-w-[90vw] h-auto' : ''}
                    ${config.ratio === '1:1' ? 'aspect-square h-full max-h-[90vh] w-auto' : ''}
                  `}
                  onClick={(e) => e.stopPropagation()}
                >
                   {config.ratio === '16:9' ? (
                      <img src={previewImage} alt="Full Preview" className="w-full h-full object-cover object-center" />
                   ) : (
                      <img src={previewImage} alt="Full Preview" className="w-full h-full object-cover object-top" />
                   )}
                  
                  <button type="button" onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors backdrop-blur-md border border-white/10 z-20">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </LayoutWrapper>
        );

      default:
        return null;
    }
  };

  return (
    <React.Fragment>
      {renderContent()}

      {/* --- AUDIO STUDIO POPUP (FLOATING WINDOW) --- */}
      {isAudioStudioOpen && (
        <div className={`fixed z-[100] right-4 bottom-4 md:right-8 md:bottom-8 bg-gray-800/95 backdrop-blur-xl border border-emerald-500/20 shadow-[0_0_50px_rgba(34,197,94,0.15)] transition-all duration-300 flex flex-col overflow-hidden origin-bottom-right ${isAudioStudioMinimized ? 'w-[200px] h-[48px] rounded-2xl opacity-80 hover:opacity-100' : 'w-[calc(100vw-32px)] md:w-[700px] h-[calc(100vh-100px)] md:h-[520px] rounded-3xl opacity-100 scale-100'}`}>
           <div 
             className="flex items-center justify-between px-5 py-3.5 bg-white/[0.02] border-b border-white/5 cursor-pointer hover:bg-white/[0.04] transition-colors shrink-0"
             onClick={() => setIsAudioStudioMinimized(!isAudioStudioMinimized)}
           >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                   <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-[11px] font-bold tracking-widest uppercase text-zinc-100">Audio Studio</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsAudioStudioMinimized(!isAudioStudioMinimized); }}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {isAudioStudioMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsAudioStudioOpen(false); setIsAudioStudioMinimized(false); }}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
           </div>

           {!isAudioStudioMinimized && (
              <div className="flex-grow overflow-y-auto custom-scrollbar p-5 md:p-6 flex flex-col gap-5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                     <div>
                        <h2 className="text-sm font-bold text-white tracking-wide mb-1">Naskah & Suara AI</h2>
                        <p className="text-[10px] md:text-xs text-zinc-400 font-light">Atur naskah Voice Over dan pilih karakter suara untuk narasi video Anda.</p>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-5 flex-grow">
                      <div className="md:col-span-3 flex flex-col gap-3 h-full">
                          <div className="flex items-center justify-between">
                              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                                  <FileText className="w-3 h-3"/> Teks Naskah VO
                              </h3>
                              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                                 {['15s', '30s', '45s'].map(dur => (
                                   <button 
                                      key={dur} 
                                      onClick={() => { playClick(); setVoDuration(dur); }}
                                      className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${voDuration === dur ? 'bg-green-500/20 text-emerald-400 shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                                   >
                                      {dur}
                                   </button>
                                 ))}
                              </div>
                          </div>

                          <textarea
                              value={voScript}
                              onChange={(e) => setVoScript(e.target.value)}
                              placeholder="Ketik naskah Voice Over Anda di sini, atau tekan tombol AI Auto-Script di bawah..."
                              className="w-full flex-grow min-h-[120px] bg-slate-900/60 border border-white/10 rounded-xl p-3.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50 focus:bg-slate-900/80 transition-all resize-none custom-scrollbar leading-relaxed"
                          />

                          <button 
                             onClick={handleGenerateVOScript}
                             disabled={isGeneratingVOScript}
                             className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-zinc-200"
                          >
                             {isGeneratingVOScript ? <><Loader2 className="w-3 h-3 animate-spin"/> Menyusun Naskah...</> : <><Wand2 className="w-3 h-3 text-emerald-400"/> AI Auto-Script ({voDuration})</>}
                          </button>
                      </div>

                      <div className="md:col-span-2 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-5">
                          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                              <Mic className="w-3 h-3"/> Pengaturan Audio
                          </h3>

                          <div className="space-y-4">
                              <div>
                                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5 ml-1">Pilih Karakter Suara</label>
                                  <div className="relative">
                                      <select 
                                         value={voVoice} 
                                         onChange={(e) => { playClick(); setVoVoice(e.target.value); }}
                                         className="w-full appearance-none bg-black/40 border border-white/10 rounded-xl px-3.5 py-3 text-[11px] text-white focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                                      >
                                         {VOICES.map(v => <option key={v.id} value={v.id} className="bg-zinc-900">{v.name}</option>)}
                                      </select>
                                      <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                                  </div>
                              </div>

                              <div>
                                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5 ml-1">Emosi / Nada Bicara</label>
                                  <div className="relative">
                                      <select 
                                         value={voTone} 
                                         onChange={(e) => { playClick(); setVoTone(e.target.value); }}
                                         className="w-full appearance-none bg-black/40 border border-white/10 rounded-xl px-3.5 py-3 text-[11px] text-white focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                                      >
                                         {TONES.map(t => <option key={t} value={t} className="bg-zinc-900">{t}</option>)}
                                      </select>
                                      <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                                  </div>
                              </div>
                          </div>

                          <div className="flex-grow flex flex-col justify-end gap-3 mt-4">
                               {voAudioUrl && (
                                   <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-emerald-500/30 rounded-xl p-3 flex flex-col gap-2.5 animate-in zoom-in-95">
                                       <audio controls src={voAudioUrl} className="w-full h-8 custom-audio-player opacity-90 hover:opacity-100 transition-opacity" />
                                       <a 
                                          href={voAudioUrl} 
                                          download={`VO_${productName || 'Audio'}_${voTone}.wav`}
                                          className="w-full py-2 bg-green-500/10 text-emerald-300 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 hover:from-green-600 hover:to-emerald-600 hover:text-white transition-colors"
                                       >
                                          <Download className="w-3 h-3" /> Unduh Audio (WAV)
                                       </a>
                                   </div>
                               )}

                               <button 
                                  onClick={handleGenerateVOAudio} 
                                  disabled={isGeneratingVOAudio || !voScript.trim()}
                                  className="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold text-[11px] tracking-widest uppercase rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/50"
                               >
                                  {isGeneratingVOAudio ? (
                                      <><Loader2 className="w-3.5 h-3.5 animate-spin"/> Memproses...</>
                                  ) : (
                                      <><PlayCircle className="w-3.5 h-3.5"/> Buat Audio VO</>
                                  )}
                               </button>
                          </div>
                      </div>
                  </div>
              </div>
           )}
        </div>
      )}

      {/* --- UGC BLUEPRINT POPUP (FLOATING WINDOW) --- */}
      {isBlueprintOpen && (
        <div className={`fixed z-[105] left-4 bottom-4 md:left-8 md:bottom-8 bg-gray-900/95 backdrop-blur-xl border border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.15)] transition-all duration-300 flex flex-col overflow-hidden origin-bottom-left ${isBlueprintMinimized ? 'w-[200px] h-[48px] rounded-2xl opacity-80 hover:opacity-100' : 'w-[calc(100vw-32px)] md:w-[700px] h-[calc(100vh-100px)] md:h-[600px] rounded-3xl opacity-100 scale-100'}`}>
           <div 
             className="flex items-center justify-between px-5 py-3.5 bg-blue-500/10 border-b border-blue-500/20 cursor-pointer hover:bg-blue-500/20 transition-colors shrink-0"
             onClick={() => setIsBlueprintMinimized(!isBlueprintMinimized)}
           >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                   <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span className="text-[11px] font-bold tracking-widest uppercase text-blue-100">UGC Blueprint AI</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsBlueprintMinimized(!isBlueprintMinimized); }}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {isBlueprintMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsBlueprintOpen(false); setIsBlueprintMinimized(false); }}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
           </div>

           {!isBlueprintMinimized && (
              <div className="flex-grow overflow-hidden flex flex-col">
                  {!blueprintContent && !isGeneratingBlueprint ? (
                      <div className="flex-grow flex flex-col items-center justify-center p-8 text-center space-y-6">
                          <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center animate-pulse">
                              <Wand2 className="w-10 h-10 text-blue-400" />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-white mb-2">Generate Konsep Marketing Lengkap</h3>
                              <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                                  Sistem akan menganalisis produk Anda dan menghasilkan Storyboard, Hook, Script, Caption, hingga Hastag menggunakan aturan AI Creative UGC Specialist.
                              </p>
                          </div>
                          <button 
                             onClick={handleGenerateBlueprint}
                             className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs tracking-widest uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all"
                          >
                             <Sparkles className="w-4 h-4" /> Generate Blueprint Sekarang
                          </button>
                      </div>
                  ) : isGeneratingBlueprint ? (
                      <div className="flex-grow flex flex-col items-center justify-center p-8 text-center space-y-4">
                          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                          <p className="text-xs text-blue-200 font-bold uppercase tracking-widest animate-pulse">Menyusun Konsep Marketing...</p>
                          <p className="text-[10px] text-zinc-500 max-w-xs">Proses ini memakan waktu beberapa detik. AI sedang menyusun hook, script, caption, dan strategi UGC Anda.</p>
                      </div>
                  ) : (
                      <div className="flex-grow overflow-y-auto custom-scrollbar p-6">
                          <div className="prose prose-invert max-w-none prose-sm md:prose-base">
                              {renderMarkdownText(blueprintContent)}
                          </div>
                          <div className="mt-8 pt-4 border-t border-white/10 flex justify-end">
                              <button 
                                onClick={() => {
                                    safeCopyToClipboard(blueprintContent);
                                    playClick();
                                    alert("Blueprint disalin ke clipboard!");
                                }}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-xs font-bold tracking-widest uppercase text-white flex items-center gap-2 transition-all"
                              >
                                  <Copy className="w-4 h-4" /> Copy Seluruh Teks
                              </button>
                          </div>
                      </div>
                  )}
              </div>
           )}
        </div>
      )}
    </React.Fragment>
  );
}