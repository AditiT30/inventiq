//simple entry point to actually start the app

import app from './app.js';
import 'dotenv/config';


const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`API Gateway active on http://localhost:${PORT}`);
});