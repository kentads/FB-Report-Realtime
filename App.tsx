import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LayoutDashboard, 
  DollarSign, 
  MessageCircle, 
  ShoppingBag, 
  TrendingUp, 
  RefreshCw,
  Sparkles,
  Search,
  Settings,
  AlertTriangle,
  ChevronDown,
  Calendar,
  Layers,
  Clock,
  Users,
  Activity
} from 'lucide-react';

import { MetricCard } from './components/MetricCard';
import { RealtimeChart } from './components/RealtimeChart';
import { CampaignTable } from './components/CampaignTable';
import { SettingsModal } from './components/SettingsModal';
import { DashboardMetrics, ChartDataPoint, Campaign, AdAccount } from './types';
import { getMarketingInsights } from './services/geminiService';
import { fetchAdAccounts, fetchAccountData, fetchAggregatedAccountData } from './services/facebookService';

// Mock Data Generators (Only used if no token)
const generateInitialData = (): DashboardMetrics => ({
  spend: 18153496,
  impressions: 45000,
  clicks: 3200,
  conversations: 34,
  leads: 12,
  ctr: 2.1,
  cpc: 4800,
  cpr: 34000,
  conversionRate: 35.3
});

const generateInitialCampaigns = (): Campaign[] => [
  { id: '1', name: 'Chiến dịch Mùa Hè - Sale 50%', status: 'ACTIVE', spend: 5400000, results: 12, cpr: 450000 },
  { id: '2', name: 'Retargeting - Khách cũ', status: 'ACTIVE', spend: 2100000, results: 8, cpr: 262500 },
];

const generateChartData = (baseSpend: number = 1000000): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  const now = new Date();
  for (let i = 12; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600 * 1000);
    data.push({
      time: `${time.getHours()}:00`,
      spend: Math.floor(Math.random() * (baseSpend * 0.2)) + (baseSpend * 0.1),
      messages: Math.floor(Math.random() * 15) + 5,
      leads: Math.floor(Math.random() * 5),
    });
  }
  return data;
};

// Helper to determine status color based on FB account_status code
const getStatusColor = (status: number) => {
  switch (status) {
    case 1: return 'bg-green-500';
    case 2: return 'bg-red-500';
    default: return 'bg-yellow-500'; 
  }
};

const App: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>(generateInitialData());
  const [chartData, setChartData] = useState<ChartDataPoint[]>(generateChartData());
  const [campaigns, setCampaigns] = useState<Campaign[]>(generateInitialCampaigns());
  const [isRealtime, setIsRealtime] = useState(true);
  
  // Settings & Token State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fbToken, setFbToken] = useState<string>("");
  
  // Ad Accounts State
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [isUsingRealData, setIsUsingRealData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // UI States
  const [timeFilter, setTimeFilter] = useState<'hour' | 'day' | 'week' | 'month'>('week');

  // Gemini State
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Centralized Error Handling for Auth
  const handleAuthError = (errorMessage: string): boolean => {
    const isAuthError = errorMessage.includes('Error validating access token') || 
                        errorMessage.includes('session has been invalidated') ||
                        errorMessage.includes('Session has expired');
    
    if (isAuthError) {
      setFbToken("");
      localStorage.removeItem('fb_system_user_token');
      setIsUsingRealData(false);
      setAdAccounts([]);
      setSelectedAccountId("");
      setDataError("Token đã hết hạn hoặc không hợp lệ. Vui lòng nhập Token mới.");
      setIsSettingsOpen(true);
      return true;
    }
    return false;
  };

  // Initialize: Load token and fetch accounts
  useEffect(() => {
    const storedToken = localStorage.getItem('fb_system_user_token');
    if (storedToken) {
      setFbToken(storedToken);
      initializeData(storedToken);
    }
  }, []);

  const initializeData = async (token: string) => {
    setIsLoadingData(true);
    setDataError(null);
    try {
      const accounts = await fetchAdAccounts(token);
      setAdAccounts(accounts);
      
      if (accounts.length > 0) {
        const defaultId = 'all';
        setSelectedAccountId(defaultId);
        await refreshAccountMetrics(token, defaultId, accounts);
      }
      setIsUsingRealData(true);
    } catch (error: any) {
      console.error("Failed to init FB Data", error);
      if (!handleAuthError(error.message)) {
        setDataError(error.message);
        setIsUsingRealData(false);
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  const refreshAccountMetrics = async (token: string, accountId: string, manualAccounts?: AdAccount[]) => {
    try {
      let data;
      const accountsToUse = manualAccounts || adAccounts;

      if (accountId === 'all') {
        if (accountsToUse.length === 0) return;
        data = await fetchAggregatedAccountData(token, accountsToUse);
      } else {
        data = await fetchAccountData(token, accountId);
      }
      
      const { metrics: newMetrics, campaigns: newCampaigns } = data;
      setMetrics(newMetrics);
      setCampaigns(newCampaigns);
      setChartData(generateChartData(newMetrics.spend / 12)); 
      if (dataError && !dataError.includes("Token")) {
        setDataError(null);
      }
    } catch (error: any) {
       console.error("Metrics fetch error", error);
       if (!handleAuthError(error.message)) {
         setDataError(`Lỗi tải dữ liệu: ${error.message}`);
       }
    }
  };

  const handleAccountSelect = async (id: string) => {
    if (id === selectedAccountId) {
      setIsDropdownOpen(false);
      setSearchTerm("");
      return;
    }
    
    setSelectedAccountId(id);
    setIsDropdownOpen(false);
    setSearchTerm("");
    setIsLoadingData(true);
    await refreshAccountMetrics(fbToken, id);
    setIsLoadingData(false);
  };

  const handleSaveToken = async (newToken: string) => {
    setFbToken(newToken);
    localStorage.setItem('fb_system_user_token', newToken);
    await initializeData(newToken);
  };

  // Auto-Refresh Logic
  useEffect(() => {
    if (!isRealtime) return;

    const interval = setInterval(() => {
      if (isUsingRealData && fbToken && selectedAccountId) {
        refreshAccountMetrics(fbToken, selectedAccountId);
      } else {
        // Mock Data Simulation
        setMetrics(prev => {
          const addedSpend = Math.floor(Math.random() * 10000);
          const newMess = Math.random() > 0.7 ? 1 : 0;
          const newLead = newMess && Math.random() > 0.8 ? 1 : 0;
          
          const newConversations = prev.conversations + newMess;
          const newLeads = prev.leads + newLead;
          const newSpend = prev.spend + addedSpend;

          return {
            ...prev,
            spend: newSpend,
            conversations: newConversations,
            leads: newLeads,
            cpr: newLeads > 0 ? Math.floor(newSpend / newLeads) : 0,
            conversionRate: newConversations > 0 ? parseFloat(((newLeads / newConversations) * 100).toFixed(1)) : 0
          };
        });
      }
    }, isUsingRealData ? 30000 : 3000); 

    return () => clearInterval(interval);
  }, [isRealtime, isUsingRealData, fbToken, selectedAccountId, adAccounts]); 

  // Visual Chart Update Loop
  useEffect(() => {
    if (!isRealtime) return;
    const interval = setInterval(() => {
      setChartData(prev => {
        const newData = [...prev.slice(1)];
        const lastTimeStr = prev[prev.length - 1].time;
        const [hourStr] = lastTimeStr.split(':');
        let hour = parseInt(hourStr);
        if (hour === 23) hour = 0; else hour += 1;
        const baseVal = metrics.spend / 20; 
        newData.push({
          time: `${hour}:00`,
          spend: Math.abs(baseVal + (Math.random() * baseVal * 0.5)),
          messages: Math.floor(Math.random() * 5),
          leads: Math.floor(Math.random() * 2),
        });
        return newData;
      });
    }, 60000); 
    return () => clearInterval(interval);
  }, [isRealtime, metrics.spend]);

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    setShowAnalysis(true);
    setAiAnalysis("Đang phân tích dữ liệu...");
    const result = await getMarketingInsights(metrics, campaigns);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const filteredAccounts = adAccounts.filter(acc => 
    acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    acc.id.includes(searchTerm)
  );

  const selectedAccount = selectedAccountId === 'all' 
    ? { id: 'all', name: 'Tất cả tài khoản', account_status: 0, currency: adAccounts[0]?.currency || 'VND' } 
    : adAccounts.find(a => a.id === selectedAccountId);

  // Formatting helpers
  const formatCurrency = (val: number) => val.toLocaleString('vi-VN') + ' đ';
  const costPerMess = metrics.conversations > 0 ? formatCurrency(Math.round(metrics.spend / metrics.conversations)) : '0 đ';
  const costPerLead = metrics.leads > 0 ? formatCurrency(Math.round(metrics.spend / metrics.leads)) : '0 đ';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        savedToken={fbToken}
        onSaveToken={handleSaveToken}
      />

      <main className="max-w-[1600px] mx-auto p-4 md:p-6">
        
        {/* Header Section matching screenshot */}
        <header className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 p-4 mb-6">
          <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
            
            {/* Logo & Account Selector */}
            <div className="flex items-center gap-4 w-full xl:w-auto">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <LayoutDashboard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800 leading-tight">Ads Reporter</h1>
                  <p className="text-xs text-slate-500">{adAccounts.length} Tài khoản</p>
                </div>
              </div>

              <div className="h-8 w-px bg-slate-200 mx-2"></div>

              {/* Account Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsUsingRealData && setIsDropdownOpen(!isDropdownOpen)}
                  disabled={!isUsingRealData || isLoadingData}
                  className={`flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2 px-3 rounded-lg text-sm font-medium transition-all min-w-[200px] justify-between`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span className="truncate">
                      {!isUsingRealData ? "Chế độ Demo" : (selectedAccountId === 'all' ? `Tổng hợp tất cả` : selectedAccount?.name)}
                    </span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                 {/* Dropdown Menu (Reused from previous code) */}
                 {isDropdownOpen && isUsingRealData && (
                    <div className="absolute top-full left-0 mt-1 w-[300px] bg-white border border-slate-200 rounded-lg shadow-xl z-50 flex flex-col">
                      <div className="p-2 border-b border-slate-100 bg-white rounded-t-lg sticky top-0 z-10">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text" 
                            placeholder="Tìm kiếm..."
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-64 py-1">
                        <button onClick={() => handleAccountSelect('all')} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50">
                          <Layers className="w-4 h-4 text-slate-500" />
                          <span className="text-sm font-medium">Tổng hợp tất cả</span>
                        </button>
                        {filteredAccounts.map(acc => (
                          <button key={acc.id} onClick={() => handleAccountSelect(acc.id)} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50">
                             <span className={`w-2 h-2 rounded-full ${getStatusColor(acc.account_status)}`} />
                             <span className="text-sm truncate">{acc.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Middle: Time Filters */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {['Khung Giờ', 'Ngày', 'Tuần', 'Tháng'].map((label, idx) => {
                 const keys = ['hour', 'day', 'week', 'month'];
                 const key = keys[idx] as any;
                 return (
                  <button
                    key={label}
                    onClick={() => setTimeFilter(key)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeFilter === key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {label}
                  </button>
                 );
              })}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 w-full xl:w-auto justify-end">
              <div className="relative hidden md:block">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input 
                    type="text" 
                    placeholder="Lọc tên chiến dịch..." 
                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                 />
              </div>

              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white cursor-pointer hover:border-blue-400 transition-colors">
                 <Calendar className="w-4 h-4 text-slate-500" />
                 <span className="text-sm font-medium text-slate-700">16/12/2025</span>
                 <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>

              <div className="flex items-center gap-2">
                 <button className="p-2 border border-slate-200 rounded-full hover:bg-slate-50 text-xs font-medium text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> 5p
                 </button>
                 <button onClick={() => setIsRealtime(!isRealtime)} className="p-2 text-slate-500 hover:text-blue-600 transition-colors">
                    <RefreshCw className={`w-5 h-5 ${isRealtime && !isLoadingData ? 'animate-spin' : ''}`} />
                 </button>
                 <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-500 hover:text-blue-600 transition-colors">
                    <Settings className="w-5 h-5" />
                 </button>
              </div>
            </div>
          </div>
        </header>

        {/* Status Line */}
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-600">
           <span className="text-slate-400 font-medium text-xs uppercase tracking-wider">Đang xem:</span> 
           {selectedAccountId === 'all' ? `TỔNG HỢP (${adAccounts.length} TÀI KHOẢN)` : selectedAccount?.name.toUpperCase()}
        </div>

        {/* Error */}
        {dataError && (
           <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
             <AlertTriangle className="w-5 h-5 shrink-0" />
             <span>{dataError}</span>
             <button onClick={() => setDataError(null)} className="ml-auto underline">Đóng</button>
           </div>
        )}

        {/* Metric Cards - Matched to Image */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 transition-opacity duration-300 ${isLoadingData ? 'opacity-50' : 'opacity-100'}`}>
          
          <MetricCard 
            title="Đã chi tiêu"
            value={formatCurrency(metrics.spend)}
            subValue="Tổng ngân sách"
            subValueColor="text-blue-600 font-medium"
            icon={<DollarSign className="w-6 h-6 text-blue-600" />}
            colorClass="bg-blue-50"
          />

          <MetricCard 
            title="Tổng Mess"
            value={metrics.conversations.toString()}
            subValue={`Chi phí/Mess: ${costPerMess}`}
            icon={<MessageCircle className="w-6 h-6 text-purple-600" />}
            colorClass="bg-purple-50"
          />

          <MetricCard 
            title="Tổng Lượt mua (Data)"
            value={metrics.leads.toString()}
            subValue={`Chi phí/Data: ${costPerLead}`}
            icon={<ShoppingBag className="w-6 h-6 text-green-600" />}
            colorClass="bg-green-50"
          />

          <MetricCard 
            title="Hiệu quả (Mess → Mua)"
            value={`${metrics.conversionRate}%`}
            subValue="Tỷ lệ chuyển đổi"
            subValueColor="text-orange-600"
            icon={<TrendingUp className="w-6 h-6 text-orange-600" />}
            colorClass="bg-orange-50"
          />
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
               <Activity className="w-5 h-5 text-blue-500" />
               Biểu đồ xu hướng (theo tuần)
             </h3>
          </div>
          <div className="h-[400px]">
             <RealtimeChart data={chartData} />
          </div>
        </div>

        {/* Bottom Section: Gemini & Table */}
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
           <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="font-bold text-slate-800 text-lg">Chi tiết báo cáo</h3>
              <button 
                 onClick={handleAiAnalysis}
                 disabled={isAnalyzing}
                 className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                {isAnalyzing ? 'Đang phân tích...' : 'Phân tích AI'}
              </button>
           </div>
           
           {aiAnalysis && showAnalysis && (
              <div className="p-4 bg-indigo-50 border-b border-indigo-100">
                <div className="prose prose-sm max-w-none text-slate-700">
                  <pre className="whitespace-pre-wrap font-sans text-sm">{aiAnalysis}</pre>
                </div>
              </div>
           )}

           <div className="p-0">
             <CampaignTable campaigns={campaigns} />
           </div>
        </div>

      </main>
    </div>
  );
};

export default App;