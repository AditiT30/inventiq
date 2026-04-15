//core engine of real-time system(SSE)
//the brain (pub-sub system)
//Maintains a list of connected clients and pushes events to them based on channels

import type { Response } from "express";

export type LiveChannel =
  | "products"
  | "orders"
  | "batches"
  | "history"
  | "dashboard"
  | "customers"
  | "suppliers";

export type LiveEvent = { //what gets sent to frontend
  action: string;
  entity: string;
  channels: LiveChannel[]; //allows multi-channel broadcasting
  timestamp: string;
  id?: string;
};

type Client = { //Represents one connected user
  id: number;
  channels: Set<LiveChannel>;  //what they subscribed to
  res: Response; //their open SSE connection
};

const clients = new Map<number, Client>(); //Stores all connected users

let nextClientId = 1; //Auto-increment ID generator

//Event serializer - Converts event → SSE format
const serializeEvent = (event: LiveEvent) => `data: ${JSON.stringify(event)}\n\n`;

//CORE FUNCTION 1 : SUBSCRIBE
export const subscribeLiveEvents = ( //Called when user connects
  res: Response,
  channels: Iterable<LiveChannel>
) => {
  // Keep a lightweight in-memory subscriber registry for SSE clients.
  const clientId = nextClientId++; //Assign unique ID
  const client: Client = { //Create client object
    id: clientId,
    channels: new Set(channels),
    res,
  };

  clients.set(clientId, client); //registers client , now server “knows” this user exists

  res.write( //Send initial message
    serializeEvent({
      action: "connected",
      entity: "events",
      channels: [...client.channels],
      timestamp: new Date().toISOString(),
    })
  );

  return () => { //Returns unsubscribe function
    clients.delete(clientId);
  };
};

//CORE FUNCTION 2: PUBLISH
export const publishLiveEvent = (event: Omit<LiveEvent, "timestamp">) => {
  //Called when something changes

  // Events are only pushed to clients subscribed to at least one matching channel.
  const nextEvent: LiveEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };


  for (const client of clients.values()) { //Iterate over all connected users
    //CORE LOGIC  - if client cares about event => send
    const shouldSend = nextEvent.channels.some((channel) =>
      client.channels.has(channel)
    );

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
