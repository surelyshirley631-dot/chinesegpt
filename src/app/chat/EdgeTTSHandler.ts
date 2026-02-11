// Client-side handler for Cloud TTS (via API)

export const CLOUD_VOICES = [
  { name: 'Xiaoxiao (Mainland Female)', shortName: 'zh-CN-XiaoxiaoNeural', locale: 'zh-CN', gender: 'Female', region: 'Mainland China' },
  { name: 'Yunxi (Mainland Male)', shortName: 'zh-CN-YunxiNeural', locale: 'zh-CN', gender: 'Male', region: 'Mainland China' },
  { name: 'HiuMaan (HK Female)', shortName: 'zh-HK-HiuMaanNeural', locale: 'zh-HK', gender: 'Female', region: 'Hong Kong' },
  { name: 'WanLung (HK Male)', shortName: 'zh-HK-WanLungNeural', locale: 'zh-HK', gender: 'Male', region: 'Hong Kong' },
  { name: 'HsiaoChen (Taiwan Female)', shortName: 'zh-TW-HsiaoChenNeural', locale: 'zh-TW', gender: 'Female', region: 'Taiwan' },
  { name: 'YunJhe (Taiwan Male)', shortName: 'zh-TW-YunJheNeural', locale: 'zh-TW', gender: 'Male', region: 'Taiwan' },
];

export const playCloudTTS = async (text: string, voiceShortName: string, rate: number = 1.0) => {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice: voiceShortName,
        rate,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `TTS API failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    
    return new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      audio.onerror = (e: any) => {
        URL.revokeObjectURL(url);
        reject(new Error(`Audio playback failed: ${e.message || 'Unknown error'}`));
      };
      audio.play().catch(reject);
    });

  } catch (error) {
    console.error("Cloud TTS Error:", error);
    throw error;
  }
};
