const User = require("../models/User");

exports.getDashboardStats = async () => {
  const totalUsers = await User.countDocuments();
  return { totalUsers };
};