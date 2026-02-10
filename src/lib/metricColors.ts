/**
 * Conditional formatting for key performance metrics.
 * 
 * % Conversion: >70% = green, <=70% = red
 * Cost/Head: <=120 = green, 121-140 = orange, >140 = red
 */

export const getConvColor = (value: number): string => {
  return value > 70 ? "text-green-500" : "text-red-500";
};

export const getCostHeadColor = (value: number): string => {
  if (value <= 120) return "text-green-500";
  if (value <= 140) return "text-orange-400";
  return "text-red-500";
};

export const CONV_TOOLTIP = "สีเขียว: > 70%, สีแดง: ≤ 70%";
export const COST_HEAD_TOOLTIP = "สีเขียว: ≤ 120, สีส้ม: 121-140, สีแดง: > 140";
