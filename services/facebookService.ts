import { DashboardMetrics, Campaign, AdAccount } from "../types";

const FB_API_VERSION = 'v19.0';

interface FbAction {
  action_type: string;
  value: string;
}

// Helper to find specific metric from actions array
const getActionValue = (actions: FbAction[] | undefined, type: string): number => {
  if (!actions) return 0;
  const action = actions.find(a => a.action_type === type);
  return action ? parseFloat(action.value) : 0;
};

// Helper: Calculate sums manually if needed for multiple campaigns
const calculateMetricsFromCampaigns = (campaignsData: any[]): DashboardMetrics => {
  let spend = 0;
  let impressions = 0;
  let clicks = 0;
  let conversations = 0;
  let leads = 0;

  campaignsData.forEach(camp => {
    const insights = camp.insights?.data?.[0] || {};
    spend += parseFloat(insights.spend || '0');
    impressions += parseFloat(insights.impressions || '0');
    clicks += parseFloat(insights.clicks || '0');
    
    const actions = insights.actions || [];
    // Sum up leads and messages
    leads += getActionValue(actions, 'lead') + getActionValue(actions, 'onsite_conversion.lead_grouped');
    conversations += getActionValue(actions, 'onsite_conversion.messaging_conversation_started_7d');
  });

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  // Cost per result (prioritize leads, then conversations)
  const totalResults = leads + conversations;
  const cpr = totalResults > 0 ? spend / totalResults : 0;
  const conversionRate = conversations > 0 ? (leads / conversations) * 100 : 0;

  return {
    spend,
    impressions,
    clicks,
    conversations,
    leads,
    ctr: parseFloat(ctr.toFixed(2)),
    cpc: Math.round(cpc),
    cpr: Math.round(cpr),
    conversionRate: parseFloat(conversionRate.toFixed(2))
  };
};

// 1. Fetch List of Ad Accounts
export const fetchAdAccounts = async (token: string): Promise<AdAccount[]> => {
  try {
    // Request account_status field
    const res = await fetch(`https://graph.facebook.com/${FB_API_VERSION}/me/adaccounts?fields=name,id,currency,account_status&limit=100&access_token=${token}`);
    const data = await res.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.data || data.data.length === 0) {
      throw new Error("Không tìm thấy tài khoản quảng cáo nào liên kết với Token này.");
    }

    return data.data.map((acc: any) => ({
      id: acc.id,
      name: acc.name,
      currency: acc.currency,
      account_status: acc.account_status // Store status
    }));
  } catch (error: any) {
    console.error("FB API Account Fetch Error:", error);
    throw new Error(error.message || "Lỗi khi lấy danh sách tài khoản.");
  }
};

// 2. Fetch Data for a Specific Account ID
export const fetchAccountData = async (token: string, adAccountId: string) => {
  try {
    // Get Campaigns & Insights for Today
    const campaignsRes = await fetch(
      `https://graph.facebook.com/${FB_API_VERSION}/${adAccountId}/campaigns?` +
      `fields=name,status,effective_status,insights.date_preset(today){spend,impressions,clicks,cpc,ctr,actions,cost_per_action_type}&` +
      `effective_status=['ACTIVE','PAUSED']&` +
      `access_token=${token}`
    );

    const campaignsDataRaw = await campaignsRes.json();

    if (campaignsDataRaw.error) {
      throw new Error(campaignsDataRaw.error.message);
    }

    const rawCampaigns = campaignsDataRaw.data || [];

    // Process Campaigns
    const campaigns: Campaign[] = rawCampaigns.map((c: any) => {
      const insights = c.insights?.data?.[0] || {};
      const actions = insights.actions || [];
      
      const leads = getActionValue(actions, 'lead') + getActionValue(actions, 'onsite_conversion.lead_grouped');
      const messages = getActionValue(actions, 'onsite_conversion.messaging_conversation_started_7d');
      const results = leads + messages; 
      const spend = parseFloat(insights.spend || '0');
      
      return {
        id: c.id,
        name: c.name,
        status: c.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
        spend: spend,
        results: results,
        cpr: results > 0 ? Math.round(spend / results) : 0
      };
    });

    // Calculate Total Metrics
    const metrics = calculateMetricsFromCampaigns(rawCampaigns);

    return { metrics, campaigns };

  } catch (error: any) {
    console.error("FB API Data Fetch Error:", error);
    throw new Error(error.message || "Lỗi khi lấy dữ liệu chiến dịch.");
  }
};

// 3. Fetch Data for ALL Accounts (Aggregated)
export const fetchAggregatedAccountData = async (token: string, accounts: AdAccount[]) => {
  try {
    if (accounts.length === 0) throw new Error("Không có tài khoản nào để tổng hợp.");

    // Filter accounts to match the currency of the first account to ensure metrics are comparable
    const primaryCurrency = accounts[0].currency;
    const compatibleAccounts = accounts.filter(acc => acc.currency === primaryCurrency);

    // Fetch all accounts in parallel using Promise.all
    // We map each account to a fetch call.
    // CRITICAL: We must detect AUTH errors and throw them immediately, otherwise Promise.all resolves with partial data (or empty) and hides the root cause.
    const promises = compatibleAccounts.map(acc => 
      fetchAccountData(token, acc.id)
        .then(data => ({ ...data, accountName: acc.name }))
        .catch(err => {
          const msg = err.message || '';
          // Identify Auth errors (invalid token, password change, etc.)
          if (msg.includes('Error validating access token') || 
              msg.includes('session has been invalidated') || 
              msg.includes('Session has expired')) {
             throw err; // Propagate auth error to the main Promise.all
          }
          console.warn(`Failed to fetch data for account ${acc.id}:`, err);
          return null;
        })
    );

    const results = await Promise.all(promises);
    
    // Filter out failed requests (nulls)
    const validResults = results.filter(r => r !== null) as Array<{metrics: DashboardMetrics, campaigns: Campaign[], accountName: string}>;

    if (validResults.length === 0) {
      throw new Error("Không thể lấy dữ liệu từ bất kỳ tài khoản nào. (Có thể do lỗi mạng hoặc quyền truy cập)");
    }

    // Initialize totals
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversations = 0;
    let totalLeads = 0;
    let allCampaigns: Campaign[] = [];

    // Aggregate
    validResults.forEach(res => {
      totalSpend += res.metrics.spend;
      totalImpressions += res.metrics.impressions;
      totalClicks += res.metrics.clicks;
      totalConversations += res.metrics.conversations;
      totalLeads += res.metrics.leads;

      // Add account name to campaign name for clarity in "All" view
      const enrichedCampaigns = res.campaigns.map(c => ({
        ...c,
        name: `[${res.accountName}] ${c.name}`
      }));
      allCampaigns = [...allCampaigns, ...enrichedCampaigns];
    });

    // Recalculate derived metrics
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const totalResults = totalLeads + totalConversations;
    const cpr = totalResults > 0 ? totalSpend / totalResults : 0;
    const conversionRate = totalConversations > 0 ? (totalLeads / totalConversations) * 100 : 0;

    const aggregatedMetrics: DashboardMetrics = {
      spend: totalSpend,
      impressions: totalImpressions,
      clicks: totalClicks,
      conversations: totalConversations,
      leads: totalLeads,
      ctr: parseFloat(ctr.toFixed(2)),
      cpc: Math.round(cpc),
      cpr: Math.round(cpr),
      conversionRate: parseFloat(conversionRate.toFixed(2))
    };

    // Sort campaigns by spend desc
    allCampaigns.sort((a, b) => b.spend - a.spend);

    return { metrics: aggregatedMetrics, campaigns: allCampaigns };

  } catch (error: any) {
    console.error("Aggregated Data Fetch Error:", error);
    throw new Error(error.message || "Lỗi khi tổng hợp dữ liệu.");
  }
};