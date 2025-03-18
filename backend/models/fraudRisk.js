const calculateFraudRisk = async customer => {
  // Fraud risk calculation logic
  let riskScore = 0;

  // Account age factor (0-30 points)
  const accountAgeInDays =
    (new Date() - new Date(customer.accountCreatedAt)) / (1000 * 60 * 60 * 24);
  if (accountAgeInDays < 30) {
    riskScore += 30;
  } else if (accountAgeInDays < 90) {
    riskScore += 20;
  } else if (accountAgeInDays < 180) {
    riskScore += 10;
  }

  // Transaction pattern factor (0-25 points)
  if (customer.monthlyTransactions > 100) {
    riskScore += 25;
  } else if (customer.monthlyTransactions > 50) {
    riskScore += 15;
  } else if (customer.monthlyTransactions > 20) {
    riskScore += 5;
  }

  // Location change factor (0-20 points)
  if (customer.recentLocationChanges > 3) {
    riskScore += 20;
  } else if (customer.recentLocationChanges > 1) {
    riskScore += 10;
  }

  // Device changes factor (0-15 points)
  if (customer.recentDeviceChanges > 3) {
    riskScore += 15;
  } else if (customer.recentDeviceChanges > 1) {
    riskScore += 8;
  }

  // Failed login attempts (0-10 points)
  if (customer.failedLoginAttempts > 5) {
    riskScore += 10;
  } else if (customer.failedLoginAttempts > 2) {
    riskScore += 5;
  }

  return Math.min(100, riskScore); // Cap at 100
};

module.exports = calculateFraudRisk;
