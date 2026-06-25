const loginAttempts = new Map();

const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  const limitWindow = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, []);
  }

  // Filter out attempts that are older than the 15 minute limit window
  const attempts = loginAttempts.get(ip).filter(timestamp => now - timestamp < limitWindow);
  attempts.push(now);
  loginAttempts.set(ip, attempts);

  if (attempts.length > maxAttempts) {
    return res.status(429).json({
      error: 'Too many login attempts. Please try again in 15 minutes.'
    });
  }

  next();
};

module.exports = rateLimiter;
