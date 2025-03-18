const employees = [
  {
    id: "EMP001",
    type: "Tech",
    isFree: true,
    currentTicket: null,
    password: "tech123", // In production, hash this
    domains: ["Payments & Clearing Department", "Regulatory & Compliance Department"],
  },
  {
    id: "EMP002",
    type: "Non-Tech",
    isFree: true,
    currentTicket: null,
    password: "nontech123", // In production, hash this
    domains: [
      "Retail Banking & Customer Support",
      "Loan & Credit Department",
      "Wealth Management & Deposit Services",
    ],
  },
  {
    id: "EMP003",
    type: "Tech",
    isFree: true,
    currentTicket: null,
    password: "tech",
    domains: ["Payments & Clearing Department", "Regulatory & Compliance Department"],
  },
  {
    id: "EMP004",
    type: "Non-Tech",
    isFree: true,
    currentTicket: null,
    password: "nontech",
    domains: [
      "Retail Banking & Customer Support",
      "Loan & Credit Department",
      "Wealth Management & Deposit Services",
    ],
  },
];

module.exports = employees;
