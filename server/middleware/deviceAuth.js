const deviceAuth = (req, res, next) => {
  const deviceKey = req.headers['x-device-key'];
  if (!deviceKey || deviceKey !== process.env.DEVICE_API_KEY) {
    return res.status(401).json({ success: false, message: 'Invalid device API key' });
  }
  next();
};

module.exports = deviceAuth;
