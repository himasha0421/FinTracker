import type {
  InsertInvestment,
  InsertInvestmentGroup,
  InsertInvestmentContribution,
  Investment,
  InvestmentGroup,
  InvestmentContribution,
} from '@shared/schema';

export type InvestmentItem = Investment;
export type InvestmentGroupItem = InvestmentGroup;
export type InvestmentContributionItem = InvestmentContribution;

export type CreateInvestmentPayload = InsertInvestment;
export type UpdateInvestmentPayload = Partial<InsertInvestment>;
export type CreateInvestmentGroupPayload = InsertInvestmentGroup;
export type UpdateInvestmentGroupPayload = Partial<InsertInvestmentGroup>;

export type ContributionDateInput = string | Date;
type ContributionPayloadBase = Omit<InsertInvestmentContribution, 'date'> & {
  date?: ContributionDateInput | null;
};

export type CreateContributionPayload = ContributionPayloadBase;
export type UpdateContributionPayload = Partial<ContributionPayloadBase>;
