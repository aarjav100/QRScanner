import jsQR from 'jsqr';

export const scanQRCodeFromImage = (imageFile: File): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      if (imageData) {
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        resolve(code ? code.data : null);
      } else {
        resolve(null);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageFile);
  });
};

export const detectQRType = (content: string): 'text' | 'url' | 'wifi' | 'email' | 'phone' => {
  if (content.startsWith('WIFI:')) return 'wifi';
  if (content.startsWith('mailto:') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content)) return 'email';
  if (content.startsWith('tel:') || /^\+?[\d\s\-\(\)]+$/.test(content)) return 'phone';
  if (content.startsWith('http://') || content.startsWith('https://') || /^www\./i.test(content)) return 'url';
  return 'text';
};

export const parseWiFiQR = (content: string) => {
  const match = content.match(/WIFI:T:([^;]*);S:([^;]*);P:([^;]*);H:([^;]*);/);
  if (match) {
    return {
      security: match[1] || 'WPA',
      ssid: match[2] || '',
      password: match[3] || '',
      hidden: match[4] === 'true'
    };
  }
  return null;
};