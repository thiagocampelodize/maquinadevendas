import { companiesService } from './companiesService';

const DEFAULT_RETROACTIVE_DAYS_LIMIT = 30;

export const settingsService = {
  async getRetroactiveDaysLimit(companyId: string): Promise<number> {
    const company = await companiesService.getCompanyById(companyId);
    const configuredDays = company?.retroactive_days_limit;

    if (typeof configuredDays === 'number' && !Number.isNaN(configuredDays)) {
      return Math.max(0, Math.floor(configuredDays));
    }

    const configuredMonths = company?.retroactive_months_limit;
    if (typeof configuredMonths === 'number' && !Number.isNaN(configuredMonths)) {
      return Math.max(0, Math.floor(configuredMonths * 30));
    }

    return DEFAULT_RETROACTIVE_DAYS_LIMIT;
  },

  async updateRetroactiveDaysLimit(companyId: string, days: number): Promise<boolean> {
    const normalized = Math.max(0, Math.floor(days));
    const updated = await companiesService.updateCompany(companyId, {
      retroactive_days_limit: normalized,
    });
    return !!updated;
  },
};
