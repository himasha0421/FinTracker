import type {
  InsertInvestment,
  InsertInvestmentContribution,
  Investment,
  InvestmentContribution,
} from '@shared/schema';

export type InvestmentItem = Investment;
export type InvestmentContributionItem = InvestmentContribution;

export type CreateInvestmentPayload = InsertInvestment;
export type UpdateInvestmentPayload = Partial<InsertInvestment>;

export type ContributionDateInput = string | Date;
type ContributionPayloadBase = Omit<InsertInvestmentContribution, 'date'> & {
  date?: ContributionDateInput | null;
};

export type CreateContributionPayload = ContributionPayloadBase;
export type UpdateContributionPayload = Partial<ContributionPayloadBase>;
