//handles the login logic
/*
login
signup
token handling
*/
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { AppError } from '../errors/AppError.js';
import { createSession, releaseSession } from '../lib/sessionStore.js';
const sessionExpiry = '8h';
export const login = async (req, res) => {
    const { username, password } = req.body;
    const isUserValid = username === process.env.APP_USER;
    const isPassValid = await bcrypt.compare(password, process.env.APP_PASS_HASH || ''); //takes the plain password and mathematically checks it against the hash , an async operation
    if (isUserValid && isPassValid) {
        const sessionId = await createSession();
        if (!sessionId) {
            throw new AppError('Maximum of 5 concurrent users already reached', 429);
        }
        //jwt.sign(payload, secretOrPrivateKey, [options, callback])
        const token = jwt.sign({ user: username, session_id: sessionId }, // Payload: Data to store in the token
        process.env.JWT_SECRET, { expiresIn: sessionExpiry });
        return res.json({ token });
    }
    res.status(401).json({ error: 'Invalid credentials' });
};
export const logout = async (req, res) => {
    const payload = req.user;
    if (payload?.session_id) {
        await releaseSession(payload.session_id);
    }
    res.json({ message: 'Logged out successfully' });
};
//# sourceMappingURL=authController.js.map