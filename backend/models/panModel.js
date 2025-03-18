const mongoose = require("mongoose");

const panSchema = new mongoose.Schema(
  {
    panNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      minlength: 10,
      maxlength: 10,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    tax_filing_status: {
      type: String,
      enum: ["Filed", "Not Filed", "Pending"],
      default: "Filed",
    },
    income_range: {
      type: String,
      required: true,
    },
    is_verified: {
      type: Boolean,
      default: true,
    },
    verification_date: {
      type: Date,
      default: Date.now,
    },
    spending_behavior: {
      avg_monthly_spend: {
        type: Number,
        required: true,
      },
      spending_categories: {
        type: Map,
        of: Number,
      },
      payment_mode_distribution: {
        type: Map,
        of: Number,
      },
      high_value_transactions: {
        type: Number,
        default: 0,
      },
      liquidity_ratio: {
        type: Number,
        required: true,
      },
    },
    benchmark_data: {
      industry_avg_spend: {
        type: Number,
      },
      spending_deviation: {
        type: String,
      },
    },
    cibil_id: {
      type: String,
      required: true,
    },
    credit_score: {
      type: Number,
      required: true,
      min: 300,
      max: 900,
    },
    loan_history: [
      {
        loan_id: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        status: {
          type: String,
          enum: ["Active", "Closed", "Defaulted", "Pending"],
          required: true,
        },
        emi: {
          type: Number,
          required: true,
        },
        tenure: {
          type: String,
          required: true,
        },
        applied_date: {
          type: Date,
          required: true,
        },
        closed_date: {
          type: Date,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Create indexes for faster queries
panSchema.index({ panNumber: 1 });
panSchema.index({ phoneNumber: 1 });
panSchema.index({ credit_score: 1 });

const Pan = mongoose.model("Pan", panSchema);

module.exports = Pan;
