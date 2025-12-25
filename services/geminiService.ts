import { GoogleGenAI } from "@google/genai";
import { DashboardMetrics, Campaign } from "../types";

// Initialize the client. 
// Note: In a real production app, you might want to proxy this through a backend 
// or require the user to input their key if not in env.
const apiKey = process.env.API_KEY || ''; 

export const getMarketingInsights = async (
  metrics: DashboardMetrics,
  campaigns: Campaign[]
): Promise<string> => {
  if (!apiKey) {
    return "Vui lòng cấu hình API Key để sử dụng tính năng phân tích AI.";
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Đóng vai trò là một chuyên gia Marketing Facebook Ads cao cấp. 
    Hãy phân tích các số liệu hiệu suất hiện tại sau đây và đưa ra nhận xét ngắn gọn, súc tích bằng tiếng Việt.
    Tập trung vào tính hiệu quả chi phí (CPR), tỷ lệ chuyển đổi và xu hướng.
    
    Số liệu tổng quan:
    - Chi tiêu: ${metrics.spend.toLocaleString('vi-VN')} VNĐ
    - Số tin nhắn (Conversations): ${metrics.conversations}
    - Số khách hàng (Leads): ${metrics.leads}
    - Tỷ lệ chuyển đổi (Mess -> Lead): ${metrics.conversionRate}%
    - CTR: ${metrics.ctr}%
    - CPC: ${metrics.cpc.toLocaleString('vi-VN')} VNĐ
    
    Top chiến dịch:
    ${campaigns.slice(0, 3).map(c => `- ${c.name}: Tiêu ${c.spend.toLocaleString()}đ, ${c.results} kết quả`).join('\n')}

    Định dạng đầu ra: Markdown. Sử dụng bullet points. Đưa ra 3 lời khuyên cụ thể để tối ưu ngay lập tức.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for faster response on simple analysis
      }
    });

    return response.text || "Không thể tạo phân tích vào lúc này.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Đã xảy ra lỗi khi kết nối với Gemini AI. Vui lòng kiểm tra API Key.";
  }
};