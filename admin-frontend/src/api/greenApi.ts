/**
 * Green API клиент для работы с WhatsApp
 * Документация: https://green-api.com/docs/
 */

const GREEN_API_BASE_URL = 'https://api.green-api.com';
const ID_INSTANCE = '7107486710';
const API_TOKEN_INSTANCE = '6633644896594f7db36235195f23579325e7a9498eab4411bd';

export interface GreenApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Получить QR-код для авторизации WhatsApp
 * Green API может возвращать изображение напрямую или JSON
 */
export async function getQRCode(): Promise<GreenApiResponse<string>> {
  try {
    // Добавляем таймаут для запроса
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд
    
    const response = await fetch(
      `${GREEN_API_BASE_URL}/waInstance${ID_INSTANCE}/qr/${API_TOKEN_INSTANCE}`,
      {
        method: 'GET',
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);

    // Green API может возвращать 200 OK даже при alreadyLogged
    // Поэтому проверяем только критические ошибки
    // ВАЖНО: Не читаем response здесь, чтобы не блокировать дальнейшее чтение
    if (!response.ok && response.status >= 400) {
      // Клонируем response для чтения ошибки, чтобы не блокировать оригинальный response
      const errorResponse = response.clone();
      const errorText = await errorResponse.text();
      console.error('QR code request failed:', response.status, errorText);
      return {
        success: false,
        error: `Ошибка получения QR-кода: ${response.status} ${errorText}`,
      };
    }

    const contentType = response.headers.get('content-type');
    
    // Если это изображение, конвертируем в base64
    if (contentType && contentType.includes('image')) {
      try {
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result) {
              resolve({
                success: true,
                data: reader.result as string,
              });
            } else {
              resolve({
                success: false,
                error: 'Не удалось прочитать изображение QR-кода',
              });
            }
          };
          reader.onerror = (error) => {
            console.error('FileReader error:', error);
            resolve({
              success: false,
              error: 'Ошибка чтения изображения QR-кода. Попробуйте обновить страницу.',
            });
          };
          reader.readAsDataURL(blob);
        });
      } catch (blobError: any) {
        console.error('Error reading blob:', blobError);
        return {
          success: false,
          error: `Ошибка при обработке изображения: ${blobError?.message || 'Неизвестная ошибка'}`,
        };
      }
    }
    
    // Если это JSON или текст
    try {
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // Если не JSON, пытаемся прочитать как текст
        // Клонируем response, если уже был прочитан
        const textResponse = response.bodyUsed ? await fetch(response.url).then(r => r.clone()) : response.clone();
        const textData = await textResponse.text();
        console.log('QR code text response:', textData);
        
        // Проверяем, не является ли это сообщением об ошибке
        if (textData.toLowerCase().includes('already logged') || 
            textData.toLowerCase().includes('already authorized') ||
            textData.toLowerCase().includes('уже авторизован')) {
          return {
            success: false,
            error: 'ALREADY_AUTHORIZED',
          };
        }
        
        // Если это не JSON и не изображение, возвращаем ошибку
        return {
          success: false,
          error: `Неожиданный формат ответа от сервера: ${textData.substring(0, 100)}`,
        };
      }
      
      console.log('QR code JSON response:', data);
      
      // Проверяем тип ответа от Green API
      // Green API возвращает type: "alreadyLogged" когда экземпляр уже авторизован
      if (data.type === 'alreadyLogged' || data.type === 'alreadyAuthorized') {
        return {
          success: false,
          error: 'ALREADY_AUTHORIZED',
        };
      }
      
      // Проверяем, не является ли это сообщением об уже авторизованном экземпляре
      const message = data.message || data.error || '';
      const messageStr = typeof message === 'string' ? message.toLowerCase() : '';
      
      if (messageStr.includes('already logged') || 
          messageStr.includes('already authorized') ||
          messageStr.includes('instance already') ||
          messageStr.includes('уже авторизован') ||
          messageStr.includes('instance account already authorized')) {
        // Экземпляр уже авторизован, возвращаем специальный флаг
        return {
          success: false,
          error: 'ALREADY_AUTHORIZED',
        };
      }
      
      // Если это успешный ответ с QR-кодом (type: "qrCode")
      if (data.type === 'qrCode' && data.message) {
        // message содержит base64 изображение QR-кода
        const qrBase64 = data.message;
        if (qrBase64.startsWith('data:image') || qrBase64.startsWith('http')) {
          return {
            success: true,
            data: qrBase64,
          };
        }
        // Если это просто base64 без префикса, добавляем его
        if (qrBase64 && !qrBase64.startsWith('data:')) {
          return {
            success: true,
            data: `data:image/png;base64,${qrBase64}`,
          };
        }
      }
      
      // Если это объект с полем qr, извлекаем его
      let qrCode = data.qr || data.qrCode || data.message || data;
      
      // Если это объект, пытаемся найти строковое значение
      if (typeof qrCode === 'object' && qrCode !== null) {
        // Если объект содержит поле с URL или base64
        if (qrCode.url) {
          qrCode = qrCode.url;
        } else if (qrCode.data) {
          qrCode = qrCode.data;
        } else {
          // Преобразуем объект в JSON строку только для отладки
          console.warn('QR code is an object, trying to extract string value:', qrCode);
          qrCode = JSON.stringify(qrCode);
        }
      }
      
      // Убеждаемся, что это строка
      if (typeof qrCode !== 'string') {
        qrCode = String(qrCode);
      }
      
      // Проверяем, не является ли это сообщением об ошибке
      const qrCodeLower = qrCode.toLowerCase();
      if (qrCodeLower.includes('already logged') || 
          qrCodeLower.includes('already authorized') ||
          qrCodeLower.includes('instance already')) {
        return {
          success: false,
          error: 'ALREADY_AUTHORIZED',
        };
      }
      
      // Если это не валидный URL или base64, возвращаем ошибку
      if (!qrCode.startsWith('data:') && !qrCode.startsWith('http') && !qrCode.startsWith('https')) {
        // Проверяем, не является ли это сообщением об ошибке
        if (qrCode.length > 0 && qrCode.length < 200) {
          // Возможно, это текстовое сообщение об ошибке
          return {
            success: false,
            error: qrCode.includes('already') ? 'ALREADY_AUTHORIZED' : `Неверный формат QR-кода: ${qrCode}`,
          };
        }
        return {
          success: false,
          error: 'Неверный формат QR-кода. Попробуйте обновить.',
        };
      }
      
      return {
        success: true,
        data: qrCode,
      };
    } catch (jsonError) {
      // Если не JSON, возможно это текст с URL или сообщение об ошибке
      try {
        const text = await response.text();
        const trimmedText = text.trim();
        
        console.log('QR code response as text:', trimmedText.substring(0, 100));
        
        // Проверяем, не является ли это сообщением об ошибке
        const textLower = trimmedText.toLowerCase();
        if (textLower.includes('already logged') || 
            textLower.includes('already authorized') ||
            textLower.includes('instance already') ||
            textLower.includes('уже авторизован')) {
          return {
            success: false,
            error: 'ALREADY_AUTHORIZED',
          };
        }
        
        // Проверяем, что это валидный URL или base64
        if (trimmedText && (trimmedText.startsWith('data:') || trimmedText.startsWith('http'))) {
          return {
            success: true,
            data: trimmedText,
          };
        }
        
        // Если это не URL и не base64, но и не ошибка - возможно это текстовая ошибка
        if (trimmedText.length > 0 && trimmedText.length < 200) {
          return {
            success: false,
            error: trimmedText.includes('already') ? 'ALREADY_AUTHORIZED' : `Ошибка: ${trimmedText}`,
          };
        }
        
        return {
          success: false,
          error: 'Не удалось получить QR-код в правильном формате',
        };
      } catch (textError: any) {
        console.error('Error reading text response:', textError);
        const errorMessage = textError?.message || textError?.toString() || 'Неизвестная ошибка';
        return {
          success: false,
          error: `Ошибка чтения ответа от сервера: ${errorMessage}. Проверьте подключение к интернету и попробуйте снова.`,
        };
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Таймаут запроса. Попробуйте обновить QR-код.',
      };
    }
    console.error('Error in getQRCode:', error);
    return {
      success: false,
      error: `Ошибка сети: ${error.message || 'Неизвестная ошибка'}`,
    };
  }
}

/**
 * Проверить состояние авторизации WhatsApp
 */
export async function getStateInstance(): Promise<GreenApiResponse<{ stateInstance: string }>> {
  try {
    const response = await fetch(
      `${GREEN_API_BASE_URL}/waInstance${ID_INSTANCE}/getStateInstance/${API_TOKEN_INSTANCE}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Ошибка проверки состояния: ${response.status} ${errorText}`,
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      data: data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Ошибка сети: ${error.message}`,
    };
  }
}

/**
 * Отправить сообщение через WhatsApp
 */
export async function sendMessage(
  chatId: string,
  message: string
): Promise<GreenApiResponse<{ idMessage: string }>> {
  try {
    const response = await fetch(
      `${GREEN_API_BASE_URL}/waInstance${ID_INSTANCE}/sendMessage/${API_TOKEN_INSTANCE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: chatId,
          message: message,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Ошибка отправки сообщения: ${response.status} ${errorText}`,
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      data: data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Ошибка сети: ${error.message}`,
    };
  }
}

/**
 * Получить настройки экземпляра
 */
export async function getSettings(): Promise<GreenApiResponse<any>> {
  try {
    const response = await fetch(
      `${GREEN_API_BASE_URL}/waInstance${ID_INSTANCE}/getSettings/${API_TOKEN_INSTANCE}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Ошибка получения настроек: ${response.status} ${errorText}`,
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      data: data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Ошибка сети: ${error.message}`,
    };
  }
}

/**
 * Разлогинить экземпляр WhatsApp (logout)
 * Это позволяет получить новый QR-код для другого пользователя
 */
export async function logoutInstance(): Promise<GreenApiResponse<any>> {
  try {
    const response = await fetch(
      `${GREEN_API_BASE_URL}/waInstance${ID_INSTANCE}/logout/${API_TOKEN_INSTANCE}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Ошибка разлогина: ${response.status} ${errorText}`,
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      data: data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Ошибка сети: ${error.message}`,
    };
  }
}
