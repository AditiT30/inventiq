//core engine of real-time system(SSE)
//the brain (pub-sub system)
//Maintains a list of connected clients and pushes events to them based on channels
const clients = new Map(); //Stores all connected users
let nextClientId = 1; //Auto-increment ID generator
//Event serializer - Converts event → SSE format
const serializeEvent = (event) => `data: ${JSON.stringify(event)}\n\n`;
//CORE FUNCTION 1 : SUBSCRIBE
export const subscribeLiveEvents = (//Called when user connects
res, channels) => {
    // Keep a lightweight in-memory subscriber registry for SSE clients.
    const clientId = nextClientId++; //Assign unique ID
    const client = {
        id: clientId,
        channels: new Set(channels),
        res,
    };
    clients.set(clientId, client); //registers client , now server “knows” this user exists
    res.write(//Send initial message
    serializeEvent({
        action: "connected",
        entity: "events",
        channels: [...client.channels],
        timestamp: new Date().toISOString(),
    }));
    return () => {
        clients.delete(clientId);
    };
};
//CORE FUNCTION 2: PUBLISH
export const publishLiveEvent = (event) => {
    //Called when something changes
    // Events are only pushed to clients subscribed to at least one matching channel.
    const nextEvent = {
        ...event,
        timestamp: new Date().toISOString(),
    };
    for (const client of clients.values()) { //Iterate over all connected users
        //CORE LOGIC  - if client cares about event => send
        const shouldSend = nextEvent.channels.some((channel) => client.channels.has(channel));
        if (shouldSend) {
            client.res.write(serializeEvent(nextEvent)); //the real-time push
        }
    }
};
/*
User A (products page)
User B (orders page)
        ↓ subscribe
Server stores:
clients = {
  1 → ["products"]
  2 → ["orders"]
}
        ↓ event happens
publishLiveEvent({
  channels: ["products"]
})
        ↓ filtering
Client 1 → gets event
Client 2 → ignored
*/
//# sourceMappingURL=liveEvents.js.map