import { AggregateRootId, DomainEvent, DomainEventStream, DomainMessage, EventSourced } from "../Domain";
import EventBus from "./EventBus/EventBus";
import AggregateRootNotFoundException from "./Exception/AggregateRootNotFoundException";
import IEventStoreDBAL from "./IEventStoreDBAL";
import SnapshotStore from "./Snapshot/SnapshotStore";
import ISnapshotStoreDBAL from "./Snapshot/SnapshotStoreDBAL";

const MIN_SNAPSHOT_MARGIN: number = 10;

export default class EventStore<T extends EventSourced> {
    private readonly dbal: IEventStoreDBAL;
    private readonly eventBus: EventBus;
    private readonly snapshotStore?: SnapshotStore;
    private readonly modelConstructor;
    private readonly snapshotMargin: number;

    constructor(
        modelConstructor: new () => T,
        dbal: IEventStoreDBAL,
        eventBus: EventBus,
        snapshotStoreDbal?: ISnapshotStoreDBAL,
        snapshotMargin?: number,
    ) {
        this.modelConstructor = modelConstructor;
        this.dbal = dbal;
        this.eventBus = eventBus;
        this.snapshotMargin = snapshotMargin || MIN_SNAPSHOT_MARGIN;

        if (snapshotStoreDbal) {
            this.snapshotStore = new SnapshotStore(snapshotStoreDbal);
        }
    }

    public async load(aggregateId: AggregateRootId): Promise<T> {
        let from: number = 0;
        let eventSourced: T | null = null;

        if (this.snapshotStore) {
            const snapshot = await this.snapshotStore.retrieve(aggregateId);

            if (snapshot !== null && snapshot !== undefined) {
                eventSourced = new (this.modelConstructor)() as T;

                eventSourced.fromSnapshot(snapshot);

                from = eventSourced.version();
            }
        }

        const stream: DomainEventStream = await this.dbal.load(aggregateId, from);

        if (stream.isEmpty()) {
            throw new AggregateRootNotFoundException();
        }

        const entity = eventSourced || new (this.modelConstructor)();

        return entity.fromHistory(stream);
    }

    public async save(entity: T): Promise<void> {
        const stream: DomainEventStream = entity.getUncommitedEvents();

        await this.append(entity.getAggregateRootId(), stream);

        if (this.snapshotStore && this.isSnapshotNeeded(entity.version())) {

            await this.snapshotStore.snapshot(entity);
        }

        stream.events.forEach((message: DomainMessage) => this.eventBus.publish(message));
    }

    public async append(aggregateId: AggregateRootId, stream: DomainEventStream): Promise<void> {

        const lastEvent = stream.events[stream.events.length - 1];

        await this.dbal.append(aggregateId, stream);
    }

    private isSnapshotNeeded(version: number): boolean {
        return version !== 0 && version / this.snapshotMargin >= 1 && version % this.snapshotMargin === 0;
    }
}
