const calculateLoanRisk = async customer => {
  // Loan risk calculation logic
  let riskScore = 0;

  // Credit score factor (0-30 points)
  if (customer.creditScore < 600) {
    riskScore += 30;
  } else if (customer.creditScore < 650) {
    riskScore += 20;
  } else if (customer.creditScore < 700) {
    riskScore += 10;
  }

  // Income stability factor (0-25 points)
  if (customer.employmentDuration < 6) {
    riskScore += 25;
  } else if (customer.employmentDuration < 12) {
    riskScore += 15;
  } else if (customer.employmentDuration < 24) {
    riskScore += 5;
  }

  // Debt-to-income ratio factor (0-20 points)
  if (customer.debtToIncomeRatio > 0.5) {
    riskScore += 20;
  } else if (customer.debtToIncomeRatio > 0.3) {
    riskScore += 10;
  }

  // Payment history factor (0-15 points)
  if (customer.latePayments > 5) {
    riskScore += 15;
  } else if (customer.latePayments > 2) {
    riskScore += 8;
  }

  // Existing loans factor (0-10 points)
  if (customer.activeLoans > 3) {
    riskScore += 10;
  } else if (customer.activeLoans > 1) {
    riskScore += 5;
  }

  return Math.min(100, riskScore); // Cap at 100
};

module.exports = calculateLoanRisk;
