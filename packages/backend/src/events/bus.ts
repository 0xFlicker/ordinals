import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { createLogger } from "../utils/logger.js";

const logger = createLogger({
  name: "backend/events/bus",
});

export function createEventBridgeClient({
  endpoint,
}: {
  endpoint?: string;
} = {}) {
  return new EventBridgeClient({
    ...(endpoint ? { endpoint } : {}),
  });
}

export async function emitEvent<T>({
  event,
  eventBridge,
  eventBusName,
  source,
}: {
  event: {
    Action: string;
    Payload: T;
  };
  eventBridge: EventBridgeClient;
  eventBusName?: string;
  source: string;
}) {
  try {
    // Emit the event
    const command = new PutEventsCommand({
      Entries: [
        {
          EventBusName: eventBusName,
          Source: source,
          DetailType: event.Action,
          Detail: JSON.stringify(event.Payload),
        },
      ],
    });
    logger.debug(`Sending event ${event.Action} to EventBridge`);
    const response = await eventBridge.send(command);
    logger.debug(
      `Event ${event.Action} sent to EventBridge: ${response.Entries?.map(
        (e) => e.EventId,
      ).join(", ")}`,
    );
    return response;
  } catch (error) {
    logger.error(
      { err: error, detail: event.Payload },
      `Failed to send event ${event.Action} to EventBridge`,
    );
    throw error;
  }
}
