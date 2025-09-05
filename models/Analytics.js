const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  total: {
    type: Number,
    default: 0
  },
  daily: {
    type: Map,
    of: Number,
    default: new Map()
  },
  weekly: {
    type: Map,
    of: Number,
    default: new Map()
  },
  monthly: {
    type: Map,
    of: Number,
    default: new Map()
  },
  yearly: {
    type: Map,
    of: Number,
    default: new Map()
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 确保只有一个分析记录
analyticsSchema.statics.getOrCreate = async function() {
  let analytics = await this.findOne();
  if (!analytics) {
    analytics = new this({
      total: 0,
      daily: new Map(),
      weekly: new Map(),
      monthly: new Map(),
      yearly: new Map()
    });
    await analytics.save();
  }
  return analytics;
};

module.exports = mongoose.model('Analytics', analyticsSchema);
