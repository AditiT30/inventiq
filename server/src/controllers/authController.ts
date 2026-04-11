//handles the login logic
/*
login
signup
token handling
*/

import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    const isUserValid = username === process.env.APP_USER;
    const isPassValid = await bcrypt.compare(password, process.env.APP_PASS_HASH || ''); //takes the plain password and mathematically checks it against the hash , an async operation

    if (isUserValid && isPassValid) {

        //jwt.sign(payload, secretOrPrivateKey, [options, callback])

        const token = jwt.sign(
            { user: username }, // Payload: Data to store in the token
            process.env.JWT_SECRET!,
            { expiresIn: '8h' }
        );
        return res.json({ token });
    }jwt

    res.status(401).json({ error: 'Invalid credentials' });
};