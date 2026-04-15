//this route creates the SSE stream (SSE endpoint (/stream))
//that - authenticates user , lets them subscribe to live channels (products, orders, etc.) , keeps connection open , pushes updates in real-time
//when frontend connects, backend must: set proper headers , flush headers , keep request open , register this client in  pub/sub helper
//when connection closes - remove client from helper
import { Router } from "express";
import { subscribeLiveEvents } from "../lib/liveEvents.js"; //pub-sub engine
import { extractAuthToken, validateAuthenticatedToken } from "../middleware/auth.js";
const router = Router(); //getting express router
const validChannels = [
    "products",
    "orders",
    "batches",
    "history",
    "dashboard",
    "customers",
    "suppliers",
];
//main route -> SSE endpoint
router.get("/stream", async (req, res) => {
    // EventSource cannot send custom auth headers, so we validate the JWT from the query string here
    const token = extractAuthToken(req, true); //token comes via query param
    if (!token) {
        res.status(401).json({ error: "Unauthorized: No token provided" });
        return;
    }
    try {
        await validateAuthenticatedToken(token);
    }
    catch {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
    }
    //After this, user is trusted
    //?channels=products,orders => "products,orders" → ["products", "orders"]
    //Channel parsing
    const requestedChannels = typeof req.query.channels === "string" //Check if client passed
        ? req.query.channels
            .split(",")
            .map((channel) => channel.trim())
            .filter((channel) => //Only allow valid channels
         validChannels.includes(channel))
        : []; //If no channels => empty array
    //Final channel selection (if user asked give those , else subscribe to ALL)
    const channels = requestedChannels.length ? requestedChannels : validChannels;
    // Standard SSE headers to keep the connection open and unbuffered.
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    //most critical - Registers this client , Sends updates like - data: { product updated }
    const unsubscribe = subscribeLiveEvents(res, channels);
    // Periodic comments keep proxies and browsers from considering the stream idle.
    const keepAlive = setInterval(() => {
        res.write(": ping\n\n");
    }, 25000); //Sends comment every 25s
    //Handle disconnect - closes tab , refreshes page , loses connection
    req.on("close", () => {
        clearInterval(keepAlive); //Stop pings
        unsubscribe(); //Remove this client from event system
        res.end(); //Close connection
    });
});
export default router;
/*
Client (Dashboard)
    ↓ connects once
Server (/stream)
    ↓ keeps connection open
Event System
    ↓ pushes updates
Client UI updates live
*/
//# sourceMappingURL=events.js.map