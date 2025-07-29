// Utility functions for Safe Sound extension

// OSHA exposure limits (in hours) based on decibel levels
function getOSHALimit(decibelLevel) {
  if (decibelLevel < 85) return Number.POSITIVE_INFINITY; // No limit for safe levels
  if (decibelLevel < 90) return 8; // 85-89 dB: 8 hours
  if (decibelLevel < 95) return 8; // 90-94 dB: 8 hours
  if (decibelLevel < 100) return 4; // 95-99 dB: 4 hours
  if (decibelLevel < 105) return 2; // 100-104 dB: 2 hours
  if (decibelLevel < 110) return 1; // 105-109 dB: 1 hour
  if (decibelLevel < 115) return 0.5; // 110-114 dB: 30 minutes
  return 0.25; // 115+ dB: 15 minutes
}

// Color coding based on exposure vs OSHA limits
function getExposureColor(decibelLevel, exposureTime) {
  if (decibelLevel === 0 || exposureTime === 0) return "text-gray-400";

  const limit = getOSHALimit(decibelLevel);
  if (limit === Number.POSITIVE_INFINITY) return "text-green-500"; // Always safe for low levels

  const overExposure = exposureTime - limit;

  if (overExposure <= 0) return "text-green-500"; // Within limits
  if (overExposure <= 1) return "text-yellow-500"; // 0-1 hour over limit
  return "text-red-500"; // More than 1 hour over limit
}

// Bar color for visual representation
function getExposureBarColor(decibelLevel, exposureTime) {
  if (decibelLevel === 0 || exposureTime === 0) return "bg-gray-300";

  const limit = getOSHALimit(decibelLevel);
  if (limit === Number.POSITIVE_INFINITY) return "bg-green-500"; // Always safe for low levels

  const overExposure = exposureTime - limit;

  if (overExposure <= 0) return "bg-green-500"; // Within limits
  if (overExposure <= 1) return "bg-yellow-500"; // 0-1 hour over limit
  return "bg-red-500"; // More than 1 hour over limit
}

// Calculate daily total exposure risk
function getDailyExposureColor(totalExposure, avgLevel) {
  if (totalExposure === 0) return "text-gray-400";

  // Get OSHA limit for this decibel level
  const dailyLimit = getOSHALimit(avgLevel);
  if (dailyLimit === Number.POSITIVE_INFINITY) return "text-green-500";

  // Calculate how much over the limit we are
  const overExposure = totalExposure - dailyLimit;

  // High risk: high decibel level (85+) with long exposure time
  if (avgLevel >= 85 && totalExposure > 6) return "text-red-500";

  // Medium-high risk: over OSHA limits
  if (overExposure > 1) return "text-red-500";

  // Medium risk: slightly over limits or moderate exposure to high levels
  if (overExposure > 0 || (avgLevel >= 70 && totalExposure > 4)) return "text-yellow-500";

  // Low risk: within safe limits
  return "text-green-500";
}

function getDailyExposureBarColor(totalExposure, avgLevel) {
  if (totalExposure === 0) return "bg-gray-300";

  // Get OSHA limit for this decibel level
  const dailyLimit = getOSHALimit(avgLevel);
  if (dailyLimit === Number.POSITIVE_INFINITY) return "bg-green-500";

  // Calculate how much over the limit we are
  const overExposure = totalExposure - dailyLimit;

  // High risk: high decibel level (85+) with long exposure time
  if (avgLevel >= 85 && totalExposure > 6) return "bg-red-500";

  // Medium-high risk: over OSHA limits
  if (overExposure > 1) return "bg-red-500";

  // Medium risk: slightly over limits or moderate exposure to high levels
  if (overExposure > 0 || (avgLevel >= 70 && totalExposure > 4)) return "bg-yellow-500";

  // Low risk: within safe limits
  return "bg-green-500";
}

// Helper function to convert day abbreviations to full day names
function getFullDayName(dayAbbr) {
  const dayMap = {
    Mon: "Monday",
    Tue: "Tuesday",
    Wed: "Wednesday",
    Thu: "Thursday",
    Fri: "Friday",
    Sat: "Saturday",
    Sun: "Sunday",
  };
  return dayMap[dayAbbr] || dayAbbr;
}

// Process audio data for display
function processAudioData(rawData) {
  if (!rawData || rawData.length === 0) {
    return {
      dailyData: [],
      weeklyData: [],
      timeData: [],
      weeklyTimeData: []
    };
  }

  // Group data by hour for daily view
  const hourlyData = {};
  for (let i = 0; i < 24; i++) {
    hourlyData[i] = { level: 0, duration: 0, count: 0 };
  }

  // Group data by day for weekly view
  const dailyData = {};
  const timeByRange = {};
  const weeklyTimeByRange = {};

  rawData.forEach(item => {
    const date = new Date(item.timestamp);
    const hour = date.getHours();
    const day = date.toLocaleDateString('en-US', { weekday: 'short' });
    
    // Daily data
    if (hourlyData[hour]) {
      hourlyData[hour].level += item.level;
      hourlyData[hour].duration += 1/3600; // 1 second = 1/3600 hours
      hourlyData[hour].count += 1;
    }

    // Weekly data
    if (!dailyData[day]) {
      dailyData[day] = { level: 0, duration: 0, count: 0 };
    }
    dailyData[day].level += item.level;
    dailyData[day].duration += 1/3600;
    dailyData[day].count += 1;

    // Time by range
    const range = getDecibelRange(item.level);
    if (!timeByRange[range]) {
      timeByRange[range] = { time: 0, level: 0, count: 0 };
    }
    timeByRange[range].time += 1/3600;
    timeByRange[range].level += item.level;
    timeByRange[range].count += 1;

    // Weekly time by range
    if (!weeklyTimeByRange[range]) {
      weeklyTimeByRange[range] = { time: 0, level: 0, count: 0 };
    }
    weeklyTimeByRange[range].time += 1/3600;
    weeklyTimeByRange[range].level += item.level;
    weeklyTimeByRange[range].count += 1;
  });

  // Convert to arrays and calculate averages
  const dailyDataArray = Object.entries(hourlyData).map(([hour, data]) => ({
    hour: `${hour}${hour < 12 ? 'AM' : 'PM'}`,
    level: data.count > 0 ? Math.round(data.level / data.count) : 0,
    duration: Math.round(data.duration * 100) / 100
  }));

  const weeklyDataArray = Object.entries(dailyData).map(([day, data]) => ({
    day,
    level: data.count > 0 ? Math.round(data.level / data.count) : 0,
    totalExposure: Math.round(data.duration * 100) / 100
  }));

  const timeDataArray = Object.entries(timeByRange).map(([range, data]) => ({
    range,
    time: Math.round(data.time * 100) / 100,
    avgLevel: data.count > 0 ? Math.round(data.level / data.count) : 0
  }));

  const weeklyTimeDataArray = Object.entries(weeklyTimeByRange).map(([range, data]) => ({
    range,
    time: Math.round(data.time * 100) / 100,
    avgLevel: data.count > 0 ? Math.round(data.level / data.count) : 0
  }));

  return {
    dailyData: dailyDataArray,
    weeklyData: weeklyDataArray,
    timeData: timeDataArray,
    weeklyTimeData: weeklyTimeDataArray
  };
}

// Get decibel range for categorization
function getDecibelRange(level) {
  if (level < 40) return "20-40dB";
  if (level < 60) return "40-60dB";
  if (level < 80) return "60-80dB";
  if (level < 90) return "80-90dB";
  if (level < 100) return "90-100dB";
  return "100+dB";
}

// Export functions for use in other modules
export {
  getOSHALimit,
  getExposureColor,
  getExposureBarColor,
  getDailyExposureColor,
  getDailyExposureBarColor,
  getFullDayName,
  processAudioData
}; 