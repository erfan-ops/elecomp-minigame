/**
 * Domain: the organization survey answered between registration and
 * category selection. Stored with every game session result.
 */
export interface SurveyAnswers {
  /** Number of people in the player's organization. */
  employeeCount: number;
  /** Whether the player receives benefits (رفاهیات) at their organization. */
  hasBenefits: boolean;
}
