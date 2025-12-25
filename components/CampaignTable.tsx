import React from 'react';
import { Campaign } from '../types';
import { CheckCircle2, PauseCircle, PlayCircle } from 'lucide-react';

interface CampaignTableProps {
  campaigns: Campaign[];
}

export const CampaignTable: React.FC<CampaignTableProps> = ({ campaigns }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-gray-500 border-b border-gray-100 text-xs uppercase tracking-wider">
            <th className="p-4 font-medium">Chiến dịch</th>
            <th className="p-4 font-medium">Trạng thái</th>
            <th className="p-4 font-medium text-right">Chi tiêu</th>
            <th className="p-4 font-medium text-right">Kết quả</th>
            <th className="p-4 font-medium text-right">Chi phí/KQ</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {campaigns.map((campaign) => (
            <tr key={campaign.id} className="hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
              <td className="p-4 font-medium text-gray-900">{campaign.name}</td>
              <td className="p-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                    campaign.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                  {campaign.status === 'ACTIVE' && <PlayCircle className="w-3 h-3 mr-1" />}
                  {campaign.status === 'PAUSED' && <PauseCircle className="w-3 h-3 mr-1" />}
                  {campaign.status === 'ACTIVE' ? 'Đang chạy' : campaign.status === 'PAUSED' ? 'Tạm dừng' : 'Đã xong'}
                </span>
              </td>
              <td className="p-4 text-right text-gray-600">{campaign.spend.toLocaleString()} ₫</td>
              <td className="p-4 text-right font-semibold text-gray-900">{campaign.results}</td>
              <td className="p-4 text-right text-gray-600">{campaign.cpr.toLocaleString()} ₫</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};