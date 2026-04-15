//sets up security stack (Helmet, Rate Limiting) and the main middleware pipe
import express from 'express'; //provides the routing ,  middleware support and HTTP utility methods
import cors from 'cors'; //manages which domains (front-end apps) are allowed to talk to our API
import helmet from 'helmet'; //automatically sets various HTTP headers to protect against common web vulnerabilities like XSS
import rateLimit from 'express-rate-limit'; //tool to prevent DoS attacks by limiting how many requests a single user can make in a set timeframe
import { errorHandler } from './middleware/errorHandler.js'; //custom function that catches any errors that happen during a request so the server doesn't crash
import routes from './routes/index.js'; //imports custom API endpoints
const app = express();
app.use(helmet());
app.use(cors({
    origin: true, // allows all origins during dev
    credentials: true
}));
app.use(express.json());
// Rate Limiting -  500 requests per 15 minutes
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, //in milliseconds
    max: 500,
    message: "Too many requests from this IP, please try again later."
});
app.use(limiter); //applies to every single incoming request
// Routes & Error Handling
app.use('/api', routes);
app.use(errorHandler);
export default app;
//# sourceMappingURL=app.js.map