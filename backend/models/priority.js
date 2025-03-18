const mongoose = require("mongoose");
const Pan = require("./panModel");

const calculatePriority = async user => {
  let priorityScore = 0;

  // Fetch associated Pan document
  const pan = await Pan.findOne({ phoneNumber: user.phoneNumber });

  // 1. Customer Priority Factor (0-20 points) - From User schema
  switch (user.customerPriority) {
    case "Premium":
      priorityScore += 20;
      break;
    case "High":
      priorityScore += 15;
      break;
    case "Medium":
      priorityScore += 10;
      break;
    case "Low":
      priorityScore += 5;
      break;
    default:
      priorityScore += 5;
  }

  // 2. Account Age Factor (0-20 points) - From User schema
  const accountAgeInYears = (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24 * 365);
  if (accountAgeInYears >= 5) {
    priorityScore += 20;
  } else if (accountAgeInYears >= 3) {
    priorityScore += 15;
  } else if (accountAgeInYears >= 1) {
    priorityScore += 10;
  }

  // 3. Credit Score Factor (0-20 points) - From Pan schema
  if (pan && pan.credit_score) {
    if (pan.credit_score >= 800) {
      priorityScore += 20;
    } else if (pan.credit_score >= 700) {
      priorityScore += 15;
    } else if (pan.credit_score >= 600) {
      priorityScore += 10;
    }
  }

  // 4. Average Holdings Factor (0-20 points) - From User schema
  if (user.averageHoldings >= 2000000) {
    // 20 lakhs+
    priorityScore += 20;
  } else if (user.averageHoldings >= 1500000) {
    // 15 lakhs+
    priorityScore += 15;
  } else if (user.averageHoldings >= 1000000) {
    // 10 lakhs+
    priorityScore += 10;
  } else if (user.averageHoldings >= 500000) {
    // 5 lakhs+
    priorityScore += 5;
  }

  // 5. Activity Status and Spending Behavior Factor (0-20 points)
  // Combine isActive (User) and avg_monthly_spend (Pan)
  let activityScore = 0;
  if (user.isActive) {
    activityScore += 10; // Base 10 points for being active
  }
  if (pan && pan.spending_behavior && pan.spending_behavior.avg_monthly_spend) {
    if (pan.spending_behavior.avg_monthly_spend >= 100000) {
      activityScore += 10; // Additional 10 for high spending
    } else if (pan.spending_behavior.avg_monthly_spend >= 50000) {
      activityScore += 5; // Additional 5 for moderate spending
    }
  }
  priorityScore += Math.min(20, activityScore); // Cap at 20

  // Cap the total score at 100
  return Math.min(100, priorityScore);
};

module.exports = calculatePriority;