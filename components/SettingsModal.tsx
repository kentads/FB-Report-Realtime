import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Loader2, Save } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedToken: string;
  onSaveToken: (token: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  savedToken,
  onSaveToken 
}) => {
  const [token, setToken] = useState(savedToken);
  const [status, setStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setToken(savedToken);
    setStatus('idle');
    setMessage('');
  }, [savedToken, isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!token) {
      setStatus('invalid');
      setMessage('Vui lòng nhập Token trước khi kiểm tra.');
      return;
    }

    setStatus('testing');
    setMessage('Đang kết nối tới Graph API...');

    // Trong thực tế, bạn sẽ gọi API này:
    // const res = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${token}`);
    
    // Ở đây mình giả lập độ trễ mạng và logic kiểm tra
    setTimeout(() => {
      // Giả định token bắt đầu bằng 'EAA' (thường thấy ở FB System User Token) và có độ dài nhất định
      const isValidFormat = token.trim().startsWith('EAA') && token.length > 50;

      if (isValidFormat) {
        setStatus('valid');
        setMessage('Kết nối thành công! Token hợp lệ (System User).');
      } else {
        setStatus('invalid');
        setMessage('Token không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại.');
      }
    }, 1500);
  };

  const handleSave = () => {
    onSaveToken(token);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">Cấu hình kết nối</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Facebook System User Token
            </label>
            <textarea
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setStatus('idle');
              }}
              placeholder="EAA..."
              className="w-full h-32 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none font-mono"
            />
            <p className="mt-2 text-xs text-gray-500">
              Lấy token từ Business Manager {'>'} Users {'>'} System Users.
            </p>
          </div>

          {/* Status Alert */}
          {status !== 'idle' && (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              status === 'testing' ? 'bg-blue-50 text-blue-700' :
              status === 'valid' ? 'bg-green-50 text-green-700' :
              'bg-red-50 text-red-700'
            }`}>
              {status === 'testing' && <Loader2 className="w-5 h-5 animate-spin shrink-0" />}
              {status === 'valid' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
              {status === 'invalid' && <AlertCircle className="w-5 h-5 shrink-0" />}
              <div className="text-sm font-medium">{message}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
          <button
            onClick={handleTestConnection}
            disabled={status === 'testing'}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Kiểm tra kết nối
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" />
            Lưu cài đặt
          </button>
        </div>
      </div>
    </div>
  );
};