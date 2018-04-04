import { AggregateRootNotFoundException, IEventStoreDBAL } from ".";
import { DomainEvent, DomainEventStream, DomainMessage } from "../Domain";

export default class InMemoryEventStore implements IEventStoreDBAL {
    private readonly events: any[] = [];

    load(aggregateId: string, from: number = 0): Promise<DomainEventStream> {
        if (this.events[aggregateId]) {
            const stream = new DomainEventStream();
            const events = this.events[aggregateId];

            events
                .slice(from)
                .forEach((event: DomainEvent) => stream.events.push(DomainMessage.create(aggregateId, event)));

            return new Promise((resolve, rejesct) => resolve(stream));
        }

        throw new AggregateRootNotFoundException();
    }

    append(aggregateId: string, stream: DomainEventStream): void {
        if (! this.events[aggregateId]) {
            this.events[aggregateId] = [];
        }

        stream.events.forEach((message: DomainMessage) => {
            this.events[aggregateId].push(message.event);
        });
    }
}
