export const formatScore = (score) => `${score} / 100`;

export const getScoreColor = (score) => {
  if (score >= 85) return '#10b981';
  if (score >= 70) return '#3b82f6';
  return '#f59e0b';
};

export const getScoreBg = (score) => {
  if (score >= 85) return '#d1fae5';
  if (score >= 70) return '#dbeafe';
  return '#fef3c7';
};

export { getCDNAsset, fetchFromCDN } from './cdn';

